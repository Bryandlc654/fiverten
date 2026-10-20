import { ConfigService } from '@nestjs/config';
import { MailService } from '../src/mail/mail.service';

function serviceWith(env: Record<string, string>): MailService {
  const config = { get: (key: string): string | undefined => env[key] } as unknown as ConfigService;
  return new MailService(config);
}

describe('FIVERTEN Mail con Resend (API HTTPS)', () => {
  const originalFetch = global.fetch;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn(
      async () => new Response(JSON.stringify({ id: 'msg_123' }), { status: 200 }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  const env = {
    MAIL_TRANSPORT: 'resend',
    RESEND_API_KEY: 're_test_123',
    MAIL_FROM: 'fiverten@info.andezza.com',
    FRONTEND_URL: 'https://app-fiverten.onrender.com',
  };

  it('envía el correo de verificación con la API de Resend y el enlace correcto', async () => {
    const service = serviceWith(env);
    await service.sendEmailVerification('cliente@empresa.test', 'a1b2c3d4e5f60718293a4b5c6d7e8f90');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer re_test_123');

    const body = JSON.parse(init.body as string) as {
      from: string;
      to: string[];
      subject: string;
      html: string;
    };
    expect(body.from).toBe('fiverten@info.andezza.com');
    expect(body.to).toEqual(['cliente@empresa.test']);
    expect(body.subject).toContain('Verifica tu correo');
    expect(body.html).toContain(
      'https://app-fiverten.onrender.com/verify-email?token=a1b2c3d4e5f60718293a4b5c6d7e8f90',
    );
  });

  it('escapa el nombre de la empresa en el HTML de la invitación', async () => {
    const service = serviceWith(env);
    await service.sendOrganizationInvitation(
      'invitado@empresa.test',
      'b2c3d4e5f60718293a4b5c6d7e8f9012',
      '<b>Panadería</b> & Co',
      'Editor',
    );
    const body = JSON.parse(
      (fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string,
    ) as {
      html: string;
    };
    expect(body.html).toContain('&lt;b&gt;Panadería&lt;/b&gt; &amp; Co');
    expect(body.html).not.toContain('<b>Panadería</b>');
  });

  it('lanza un error claro si la API rechaza el envío', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('{"message":"The fiverten@info.andezza.com domain is not verified"}', {
        status: 403,
      }),
    );
    const service = serviceWith(env);
    await expect(
      service.sendPasswordReset('cliente@empresa.test', 'a1b2c3d4e5f60718293a4b5c6d7e8f90'),
    ).rejects.toThrow(/Resend respondió 403.*not verified/);
  });

  it('sin RESEND_API_KEY no intenta enviar y lo indica', async () => {
    const service = serviceWith({ ...env, RESEND_API_KEY: '' });
    await expect(service.verifyConnection()).resolves.toBe(false);
    await expect(
      service.sendPasswordReset('cliente@empresa.test', 'a1b2c3d4e5f60718293a4b5c6d7e8f90'),
    ).rejects.toThrow('Falta RESEND_API_KEY');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
