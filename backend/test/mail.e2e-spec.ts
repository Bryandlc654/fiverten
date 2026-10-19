import { ConfigService } from '@nestjs/config';
import { AddressInfo } from 'net';
import { SMTPServer } from 'smtp-server';
import { MailService } from '../src/mail/mail.service';

// Quoted-printable: los "=XX" son bytes UTF-8, así que se decodifican a bytes y luego a texto.
function decode(raw: string): string {
  const unfolded = raw.replace(/=\r?\n/g, '');
  const pieces = unfolded.split(/(=[0-9A-Fa-f]{2})/);
  return Buffer.concat(
    pieces.map((piece) =>
      /^=[0-9A-Fa-f]{2}$/.test(piece)
        ? Buffer.from([parseInt(piece.slice(1), 16)])
        : Buffer.from(piece, 'utf8'),
    ),
  ).toString('utf8');
}

describe('FIVERTEN Mail SMTP (e2e)', () => {
  let server: SMTPServer;
  let service: MailService;
  const pending: string[] = [];
  const waiters: Array<(raw: string) => void> = [];

  beforeAll(async () => {
    server = new SMTPServer({
      authOptional: true,
      disabledCommands: ['STARTTLS'],
      onData(stream, _session, callback) {
        const chunks: Buffer[] = [];
        stream.on('data', (chunk: Buffer) => chunks.push(chunk));
        stream.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');
          const waiter = waiters.shift();
          if (waiter) {
            waiter(raw);
          } else {
            pending.push(raw);
          }
          callback();
        });
      },
    });

    await new Promise<void>((resolve, reject) => {
      server.listen(0, '127.0.0.1', () => resolve());
      server.on('error', reject);
    });

    const address = server.server.address() as AddressInfo;
    const env: Record<string, string> = {
      MAIL_TRANSPORT: 'smtp',
      SMTP_HOST: '127.0.0.1',
      SMTP_PORT: String(address.port),
      SMTP_SECURE: 'false',
      MAIL_FROM: 'no-reply@fiverten.test',
      FRONTEND_URL: 'http://localhost:3000',
    };
    const config = {
      get: (key: string): string | undefined => env[key],
    } as unknown as ConfigService;

    service = new MailService(config);
    await service.onModuleInit();
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('verifica la conexion SMTP contra el servidor local', async () => {
    await expect(service.verifyConnection()).resolves.toBe(true);
  });

  it('entrega el correo de verificacion con el enlace correcto', async () => {
    const token = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';
    const received = new Promise<string>((resolve) => waiters.push(resolve));
    await service.sendEmailVerification('cliente@empresa.test', token);

    const decoded = decode(await received);
    expect(decoded).toContain('cliente@empresa.test');
    expect(decoded).toMatch(/\/verify-email\?token=([a-f0-9]{32})/);
    expect(decoded).toContain(token);
  });

  it('entrega el correo de recuperacion con el enlace correcto', async () => {
    const token = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';
    const received = new Promise<string>((resolve) => waiters.push(resolve));
    await service.sendPasswordReset('cliente@empresa.test', token);

    const decoded = decode(await received);
    expect(decoded).toContain('cliente@empresa.test');
    expect(decoded).toMatch(/\/reset-password\?token=([a-f0-9]{32})/);
    expect(decoded).toContain(token);
  });

  it('entrega la invitacion a la empresa con el enlace y el nombre de la empresa', async () => {
    const token = 'b2c3d4e5f60718293a4b5c6d7e8f9012';
    const received = new Promise<string>((resolve) => waiters.push(resolve));
    await service.sendOrganizationInvitation(
      'invitado@empresa.test',
      token,
      'Panadería Luna',
      'Editor',
    );

    const decoded = decode(await received);
    expect(decoded).toContain('invitado@empresa.test');
    expect(decoded).toContain('Panadería Luna');
    expect(decoded).toMatch(/\/accept-invitation\?token=([a-f0-9]{32})/);
    expect(decoded).toContain(token);
  });

  it('entrega el correo de confirmacion de reseña con el enlace correcto', async () => {
    const token = 'c3d4e5f60718293a4b5c6d7e8f901234';
    const received = new Promise<string>((resolve) => waiters.push(resolve));
    await service.sendReviewConfirmation('cliente@empresa.test', token, 'Clínica Dental Sonrisa');

    const decoded = decode(await received);
    expect(decoded).toContain('cliente@empresa.test');
    expect(decoded).toContain('Clínica Dental Sonrisa');
    expect(decoded).toMatch(/\/confirmar-resena\?token=([a-f0-9]{32})/);
    expect(decoded).toContain(token);
  });
});
