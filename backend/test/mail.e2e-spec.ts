import { ConfigService } from '@nestjs/config';
import { AddressInfo } from 'net';
import { SMTPServer } from 'smtp-server';
import { MailService } from '../src/mail/mail.service';

function decode(raw: string): string {
  return raw
    .replace(/=\r?\n/g, '')
    .replace(/=([0-9A-Fa-f]{2})/g, (_match, hex: string) =>
      String.fromCharCode(parseInt(hex, 16)),
    );
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
});
