import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { SentMessageInfo, Transporter } from 'nodemailer';

type TransportMode = 'resend' | 'smtp' | 'json' | 'log';

// Resend usa HTTPS (puerto 443): no depende de que el proveedor permita SMTP saliente.
const RESEND_API_URL = 'https://api.resend.com/emails';
const RESEND_TIMEOUT_MS = 15_000;

interface MailMessage {
  kind: string;
  to: string;
  subject: string;
  title: string;
  intro: string;
  action: string;
  link: string;
  /** Aviso destacado sobre el título (p. ej. una reseña negativa). */
  highlight?: string;
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
    } else if (this.mode === 'resend') {
      if (!this.resendApiKey) {
        this.logger.error(
          'MAIL_TRANSPORT=resend pero falta RESEND_API_KEY: no se enviará ningún correo',
        );
      } else {
        this.logger.log('Correo listo (Resend por HTTPS)');
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

  async sendReviewConfirmation(to: string, token: string, organizationName: string): Promise<void> {
    const link = `${this.frontendUrl}/confirmar-resena?token=${encodeURIComponent(token)}`;
    await this.send({
      kind: 'confirmacion de resena',
      to,
      subject: `Confirma tu reseña de ${organizationName} - ${BRAND}`,
      title: 'Confirma tu reseña',
      intro: `Gracias por compartir tu experiencia con ${organizationName}. Confirma tu correo para que publiquemos tu reseña. Si no la has escrito tú, ignora este mensaje y no se publicará.`,
      action: 'Confirmar y publicar',
      link,
    });
  }

  /** Solicitud personalizada de reseña con enlace único por cliente. */
  async sendReviewRequest(
    to: string,
    clientName: string,
    organizationName: string,
    url: string,
    expiresInDays: number,
  ): Promise<void> {
    const name = clientName.trim() || 'cliente';
    await this.send({
      kind: 'solicitud de reseña',
      to,
      subject: `${organizationName} te invita a contar tu experiencia - ${BRAND}`,
      title: `Hola ${name}, ¿cómo fue tu experiencia con ${organizationName}?`,
      intro: `${organizationName} te ha enviado un enlace personal para valorar tu experiencia. Solo tienes que elegir de 1 a 5 estrellas y contar brevemente qué tal fue. El enlace caduca en ${expiresInDays} ${
        expiresInDays === 1 ? 'día' : 'días'
      } y solo puede usarse una vez.`,
      action: 'Dejar mi reseña',
      link: url,
    });
  }

  /** Enlace para que el cliente siga la resolución de su reseña (sin cuenta). */
  async sendResolutionLink(
    to: string,
    token: string,
    organizationName: string,
    kind: 'open' | 'message',
  ): Promise<void> {
    const link = `${this.frontendUrl}/resolucion/${encodeURIComponent(token)}`;
    const opened = kind === 'open';
    await this.send({
      kind: 'resolucion de incidencia',
      to,
      subject: opened
        ? `${organizationName} quiere resolver tu experiencia - ${BRAND}`
        : `Tienes un nuevo mensaje de ${organizationName} - ${BRAND}`,
      title: opened
        ? `${organizationName} quiere resolverlo contigo`
        : `Nuevo mensaje de ${organizationName}`,
      intro: opened
        ? `Has dejado una reseña y ${organizationName} quiere solucionar lo ocurrido. Desde el enlace puedes responder, actualizar tu reseña o aceptar la solución propuesta. No necesitas crear una cuenta.`
        : `${organizationName} te ha escrito sobre tu reseña. Desde el enlace puedes responder o decidir si la incidencia está resuelta.`,
      action: 'Ver la resolución',
      link,
    });
  }

  /** Aviso al super admin sobre un caso de evidencias (enlace al panel de admin). */
  async sendCaseAdminAlert(
    to: string,
    title: string,
    intro: string,
    caseId: string,
  ): Promise<void> {
    await this.send({
      kind: 'caso de evidencias (admin)',
      to,
      subject: `${title} - ${BRAND}`,
      title,
      intro,
      action: 'Abrir el caso',
      link: `${this.frontendUrl}/admin/casos?id=${encodeURIComponent(caseId)}`,
    });
  }

  /** Aviso a la empresa afectada por un caso (enlace a su panel). */
  async sendCaseCompanyNotice(
    to: string,
    title: string,
    intro: string,
    caseId: string,
  ): Promise<void> {
    await this.send({
      kind: 'caso de evidencias (empresa)',
      to,
      subject: `${title} - ${BRAND}`,
      title,
      intro,
      action: 'Ver el caso',
      link: `${this.frontendUrl}/dashboard/casos?id=${encodeURIComponent(caseId)}`,
    });
  }

  /** Aviso al autor de la reseña, con el enlace (token) para participar sin cuenta. */
  async sendCaseClientNotice(
    to: string,
    title: string,
    intro: string,
    token: string,
  ): Promise<void> {
    await this.send({
      kind: 'caso de evidencias (cliente)',
      to,
      subject: `${title} - ${BRAND}`,
      title,
      intro,
      action: 'Abrir mi caso',
      link: `${this.frontendUrl}/caso/${encodeURIComponent(token)}`,
    });
  }

  /** Aviso a los responsables de la empresa de una reseña recién publicada. */
  async sendReviewNotice(
    to: string,
    title: string,
    intro: string,
    negative: boolean,
  ): Promise<void> {
    await this.send({
      kind: negative ? 'reseña negativa (empresa)' : 'nueva reseña (empresa)',
      to,
      subject: `${title} - ${BRAND}`,
      title,
      intro,
      action: negative ? 'Atender la reseña' : 'Ver la reseña',
      link: `${this.frontendUrl}/dashboard/reviews${negative ? '?lowRating=true' : ''}`,
      highlight: negative
        ? 'Reseña de baja valoración: te recomendamos responder cuanto antes.'
        : undefined,
    });
  }

  async verifyConnection(): Promise<boolean> {
    if (this.mode === 'smtp') {
      return this.getTransporter().verify();
    }
    if (this.mode === 'resend') {
      return Boolean(this.resendApiKey);
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

    if (this.mode === 'resend') {
      const id = await this.sendViaResend(message);
      this.logger.log(`[MAIL][${message.kind}] enviado a ${message.to} (resend id=${id})`);
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

  /** Envía con la API de Resend. Lanza error si no se puede entregar a la API. */
  private async sendViaResend(message: MailMessage): Promise<string> {
    const apiKey = this.resendApiKey;
    if (!apiKey) {
      throw new Error('Falta RESEND_API_KEY');
    }

    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.fromAddress,
        to: [message.to],
        subject: message.subject,
        text: this.renderText(message),
        html: this.renderHtml(message),
      }),
      signal: AbortSignal.timeout(RESEND_TIMEOUT_MS),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Resend respondió ${response.status}: ${detail.slice(0, 300)}`);
    }
    const data = (await response.json()) as { id?: string };
    return data.id ?? 'n/a';
  }

  private get resendApiKey(): string {
    return (this.config.get<string>('RESEND_API_KEY') ?? '').trim();
  }

  private renderHtml(message: MailMessage): string {
    // Algunos campos (p. ej. el nombre de la empresa) los escribe el usuario.
    const title = escapeHtml(message.title);
    const intro = escapeHtml(message.intro);
    const action = escapeHtml(message.action);
    const link = escapeHtml(message.link);
    const year = new Date().getFullYear();
    const font = "font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;";
    const highlight = message.highlight
      ? `<p style="margin:0 0 18px;padding:12px 16px;background:#fef2f2;border:1px solid #fecaca;border-radius:10px;${font}font-size:14px;line-height:20px;font-weight:600;color:#b91c1c;">${escapeHtml(message.highlight)}</p>`
      : '';
    // HTML de correo: tablas y estilos en línea (muchos clientes ignoran <style>
    // y CSS moderno). El botón es una tabla para que se vea también en Outlook.
    return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="color-scheme" content="light">
    <title>${title}</title>
  </head>
  <body style="margin:0;padding:0;background:#f1f5f9;${font}color:#0f172a;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${intro}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;">
      <tr><td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
          <tr><td style="background:#0b101b;padding:22px 32px;">
            <span style="${font}font-size:20px;font-weight:800;letter-spacing:3px;color:#ffffff;">${BRAND}</span>
            <span style="${font}font-size:12px;color:#94a3b8;padding-left:10px;">Reseñas y reputación</span>
          </td></tr>
          <tr><td style="padding:36px 32px 8px;">
            ${highlight}
            <h1 style="margin:0 0 14px;${font}font-size:24px;line-height:32px;font-weight:700;color:#0f172a;">${title}</h1>
            <p style="margin:0 0 28px;${font}font-size:15px;line-height:24px;color:#475569;">${intro}</p>
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr><td bgcolor="#2563eb" style="border-radius:10px;">
                <a href="${link}" style="display:inline-block;padding:14px 28px;${font}font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">${action}</a>
              </td></tr>
            </table>
          </td></tr>
          <tr><td style="padding:28px 32px 32px;">
            <p style="margin:0 0 6px;${font}font-size:13px;line-height:20px;color:#64748b;">¿El botón no funciona? Copia y pega este enlace en tu navegador:</p>
            <p style="margin:0 0 24px;${font}font-size:13px;line-height:20px;word-break:break-all;"><a href="${link}" style="color:#2563eb;text-decoration:underline;">${link}</a></p>
            <p style="margin:0;padding-top:20px;border-top:1px solid #e2e8f0;${font}font-size:12px;line-height:18px;color:#94a3b8;">Si no solicitaste este correo, puedes ignorarlo con tranquilidad.</p>
          </td></tr>
        </table>
        <p style="margin:20px 0 0;${font}font-size:12px;line-height:18px;color:#94a3b8;">© ${year} ${BRAND} · Plataforma de reseñas verificadas</p>
      </td></tr>
    </table>
  </body>
</html>`;
  }

  private renderText({ title, intro, action, link, highlight }: MailMessage): string {
    const lines = [`${BRAND} - ${title}`, ''];
    if (highlight) lines.push(highlight, '');
    return [...lines, intro, '', `${action}: ${link}`].join('\n');
  }

  private get mode(): TransportMode {
    const explicit = (this.config.get<string>('MAIL_TRANSPORT') ?? '').trim().toLowerCase();
    if (explicit === 'resend' || explicit === 'smtp' || explicit === 'json' || explicit === 'log') {
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
        // Tiempos máximos: un servidor SMTP lento no debe dejar la conexión colgada.
        connectionTimeout: 15_000,
        greetingTimeout: 10_000,
        socketTimeout: 20_000,
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
