import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { SentMessageInfo, Transporter } from 'nodemailer';

type TransportMode = 'smtp' | 'json' | 'log';

interface MailMessage {
  kind: string;
  to: string;
  subject: string;
  title: string;
  intro: string;
  action: string;
  link: string;
}

const BRAND = 'FIVERTEN';

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    if (this.mode === 'smtp') {
      try {
        await this.getTransporter().verify();
        this.logger.log(`SMTP listo (${this.smtpHost}:${this.smtpPort})`);
      } catch (error) {
        this.logger.error(`No se pudo verificar la conexion SMTP: ${String(error)}`);
      }
    } else {
      this.logger.log(`Correo en modo "${this.mode}" (sin servidor SMTP)`);
    }
  }

  async sendEmailVerification(to: string, token: string): Promise<void> {
    const link = `${this.frontendUrl}/verify-email?token=${encodeURIComponent(token)}`;
    await this.send({
      kind: 'verificacion de correo',
      to,
      subject: `Verifica tu correo en ${BRAND}`,
      title: 'Confirma tu direccion de correo',
      intro: 'Gracias por registrarte en FIVERTEN. Confirma tu correo para activar tu cuenta.',
      action: 'Verificar mi correo',
      link,
    });
  }

  async sendPasswordReset(to: string, token: string): Promise<void> {
    const link = `${this.frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;
    await this.send({
      kind: 'recuperacion de contrasena',
      to,
      subject: `Recupera tu contrasena - ${BRAND}`,
      title: 'Restablece tu contrasena',
      intro: 'Recibimos una solicitud para restablecer tu contrasena.',
      action: 'Restablecer contrasena',
      link,
    });
  }

  async sendOrganizationInvitation(
    to: string,
    token: string,
    organizationName: string,
    roleLabel: string,
  ): Promise<void> {
    const link = `${this.frontendUrl}/accept-invitation?token=${encodeURIComponent(token)}`;
    await this.send({
      kind: 'invitacion a empresa',
      to,
      subject: `Te han invitado a ${organizationName} en ${BRAND}`,
      title: `Únete a ${organizationName}`,
      intro: `Te han invitado a unirte a ${organizationName} en FIVERTEN con el rol "${roleLabel}". Si no esperabas esta invitación, ignora este correo: no se creará ninguna cuenta ni se te añadirá a la empresa.`,
      action: 'Ver la invitación',
      link,
    });
  }

  async verifyConnection(): Promise<boolean> {
    if (this.mode === 'smtp') {
      return this.getTransporter().verify();
    }
    return true;
  }

  // ---------------------------------------------------------------------------
  // Internos
  // ---------------------------------------------------------------------------
  private async send(message: MailMessage): Promise<void> {
    if (this.mode === 'log') {
      this.logger.log(`[MAIL][${message.kind}] from=${this.fromAddress} to=${message.to}`);
      // El enlace contiene un token de un solo uso: sólo se registra fuera de
      // producción para poder completar los flujos de desarrollo local.
      if ((this.config.get<string>('NODE_ENV') ?? 'development') !== 'production') {
        this.logger.log(`[MAIL][${message.kind}] enlace: ${message.link}`);
      }
      return;
    }

    const info = (await this.getTransporter().sendMail({
      from: this.fromAddress,
      to: message.to,
      subject: message.subject,
      text: this.renderText(message),
      html: this.renderHtml(message),
    })) as SentMessageInfo;

    this.logger.log(
      `[MAIL][${message.kind}] enviado a ${message.to} (messageId=${info.messageId ?? 'n/a'})`,
    );
  }

  private renderHtml(message: MailMessage): string {
    // Algunos campos (p. ej. el nombre de la empresa) los escribe el usuario.
    const title = escapeHtml(message.title);
    const intro = escapeHtml(message.intro);
    const action = escapeHtml(message.action);
    const link = escapeHtml(message.link);
    return `<!doctype html>
<html lang="es">
  <body style="margin:0;padding:24px;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#1f2430;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;padding:32px;">
          <tr><td style="font-size:20px;font-weight:700;color:#0d6efd;padding-bottom:16px;">${BRAND}</td></tr>
          <tr><td style="font-size:22px;font-weight:700;padding-bottom:12px;">${title}</td></tr>
          <tr><td style="font-size:15px;line-height:22px;padding-bottom:20px;">${intro}</td></tr>
          <tr><td style="padding-bottom:24px;">
            <a href="${link}" style="display:inline-block;background:#0d6efd;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;">${action}</a>
          </td></tr>
          <tr><td style="font-size:12px;color:#8a93a6;">Si no solicitaste este correo, puedes ignorarlo.</td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
  }

  private renderText({ title, intro, action, link }: MailMessage): string {
    return [`${BRAND} - ${title}`, '', intro, '', `${action}: ${link}`].join('\n');
  }

  private get mode(): TransportMode {
    const explicit = (this.config.get<string>('MAIL_TRANSPORT') ?? '').trim().toLowerCase();
    if (explicit === 'smtp' || explicit === 'json' || explicit === 'log') {
      return explicit;
    }
    return this.config.get<string>('SMTP_HOST') ? 'smtp' : 'json';
  }

  private get smtpHost(): string {
    return this.config.get<string>('SMTP_HOST') ?? '';
  }

  private get smtpPort(): number {
    return Number(this.config.get<string>('SMTP_PORT') ?? 587);
  }

  private get fromAddress(): string {
    return this.config.get<string>('MAIL_FROM') ?? 'no-reply@fiverten.local';
  }

  private get frontendUrl(): string {
    return (this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000').replace(/\/$/, '');
  }

  private getTransporter(): Transporter {
    if (this.transporter) {
      return this.transporter;
    }

    if (this.mode === 'smtp') {
      const user = this.config.get<string>('SMTP_USER');
      const pass = this.config.get<string>('SMTP_PASS');
      this.transporter = nodemailer.createTransport({
        host: this.smtpHost,
        port: this.smtpPort,
        secure: this.isTruthy(this.config.get<string>('SMTP_SECURE')),
        auth: user ? { user, pass } : undefined,
      });
    } else {
      this.transporter = nodemailer.createTransport({ jsonTransport: true });
    }
    return this.transporter;
  }

  private isTruthy(value: string | undefined): boolean {
    return value === 'true' || value === '1';
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
