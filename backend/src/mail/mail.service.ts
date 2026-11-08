import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { SentMessageInfo, Transporter } from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';
import { PlatformSettingsService } from '../settings/settings.service';

type TransportMode = 'resend' | 'smtp' | 'json' | 'log';

// Resend usa HTTPS (puerto 443): no depende de que el proveedor permita SMTP saliente.
const RESEND_API_URL = 'https://api.resend.com/emails';
const RESEND_TIMEOUT_MS = 15_000;

interface MailMessage {
  /** Código estable usado por las plantillas editables del super admin. */
  code: string;
  kind: string;
  category: 'transactional' | 'notification';
  to: string;
  subject: string;
  title: string;
  intro: string;
  action: string;
  link: string;
  /** Variables disponibles para las plantillas ({{organization}}, {{name}}…). */
  vars?: Record<string, string>;
  /** Aviso destacado sobre el título (p. ej. una reseña negativa). */
  highlight?: string;
}

const BRAND = 'FIVERTEN';

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly settings: PlatformSettingsService,
  ) {}

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
      code: 'email_verification',
      category: 'transactional',
      kind: 'verificacion de correo',
      to,
      subject: `Verifica tu correo y activa tu cuenta · ${BRAND}`,
      title: 'Solo falta confirmar tu correo',
      intro:
        'Hola. Gracias por registrarte en FIVERTEN. Pulsa el botón para confirmar que este correo es tuyo y dejar tu cuenta lista. Por seguridad, el enlace caduca en unas horas.',
      action: 'Confirmar mi correo',
      link,
    });
  }

  async sendPasswordReset(to: string, token: string): Promise<void> {
    const link = `${this.frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;
    await this.send({
      code: 'password_reset',
      category: 'transactional',
      kind: 'recuperacion de contrasena',
      to,
      subject: `Restablece tu contraseña · ${BRAND}`,
      title: '¿Olvidaste tu contraseña?',
      intro:
        'Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en FIVERTEN. Pulsa el botón para elegir una nueva. Si no fuiste tú, ignora este correo: tu contraseña no cambiará.',
      action: 'Crear nueva contraseña',
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
      code: 'organization_invitation',
      category: 'transactional',
      kind: 'invitacion a empresa',
      vars: { organization: organizationName, role: roleLabel },
      to,
      subject: `${organizationName} te ha invitado a ${BRAND}`,
      title: `Tienes una invitación para unirte a ${organizationName}`,
      intro: `Te han invitado a formar parte de ${organizationName} en FIVERTEN con el rol de ${roleLabel}. Acepta la invitación para acceder al panel de la empresa. Si no esperabas este correo, puedes ignorarlo.`,
      action: 'Ver mi invitación',
      link,
    });
  }

  async sendReviewConfirmation(to: string, token: string, organizationName: string): Promise<void> {
    const link = `${this.frontendUrl}/confirmar-resena?token=${encodeURIComponent(token)}`;
    await this.send({
      code: 'review_confirmation',
      category: 'transactional',
      kind: 'confirmacion de resena',
      vars: { organization: organizationName },
      to,
      subject: `Confirma tu reseña de ${organizationName} · ${BRAND}`,
      title: 'Tu opinión está casi lista',
      intro: `Gracias por compartir tu experiencia con ${organizationName}. Confirma tu correo para que podamos publicar tu reseña y ayudar a otros clientes a decidir. Si no la escribiste tú, ignora este mensaje.`,
      action: 'Publicar mi reseña',
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
      code: 'review_request',
      category: 'notification',
      kind: 'solicitud de reseña',
      vars: { organization: organizationName, name, days: String(expiresInDays) },
      to,
      subject: `${organizationName} quiere conocer tu experiencia · ${BRAND}`,
      title: `Hola ${name}, ¿nos cuentas cómo fue?`,
      intro: `${organizationName} te ha preparado un enlace personal para valorar tu experiencia. Elige de 1 a 5 estrellas y cuéntanos brevemente qué tal fue. El enlace caduca en ${expiresInDays} ${
        expiresInDays === 1 ? 'día' : 'días'
      } y solo puede usarse una vez.`,
      action: 'Dejar mi reseña',
      link: url,
    });
  }

  /** Solicitud pública de verificación enviada desde /verificar-empresa. */
  async sendVerificationInquiry(
    to: string,
    companyName: string,
    contactName: string,
    email: string,
    phone?: string,
    message?: string,
  ): Promise<void> {
    await this.send({
      code: 'verification_inquiry',
      category: 'transactional',
      kind: 'solicitud de verificación',
      vars: { organization: companyName, name: contactName },
      to,
      subject: `Solicitud de verificación: ${companyName} - ${BRAND}`,
      title: `Nueva solicitud de verificación`,
      intro: `${contactName} (${email}${phone ? ` · ${phone}` : ''}) quiere verificar ${companyName}. ${message ? `Mensaje: ${message}` : ''}`,
      action: 'Responder',
      link: `mailto:${email}`,
    });
  }

  /** Confirmación al contacto que envió el formulario de captación. */
  async sendVerificationInquiryConfirmation(
    to: string,
    companyName: string,
    contactName: string,
  ): Promise<void> {
    await this.send({
      code: 'verification_inquiry',
      category: 'transactional',
      kind: 'confirmación de solicitud de verificación',
      vars: { organization: companyName, name: contactName },
      to,
      subject: `Hemos recibido la solicitud de ${companyName} - ${BRAND}`,
      title: 'Solicitud recibida',
      intro: `Gracias, ${contactName}. Hemos recibido la solicitud de verificación de ${companyName}. El equipo de FIVERTEN la revisará y se pondrá en contacto contigo. Esta solicitud no implica que la empresa ya esté verificada; el estado VERIFIED solo se activa tras la revisión.`,
      action: 'Volver a FIVERTEN',
      link: `${this.frontendUrl}/verificar-empresa`,
    });
  }

  /** Recordatorio para renovar la verificación antes de que caduque. */
  async sendVerificationExpiryReminder(
    to: string,
    organizationName: string,
    expiresAt: Date,
    daysLeft: number,
  ): Promise<void> {
    const date = expiresAt.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    await this.send({
      code: 'verification_expiry_reminder',
      category: 'notification',
      kind: 'recordatorio de renovación de verificación',
      vars: { organization: organizationName, date, days: String(daysLeft) },
      to,
      subject: `Tu verificación caduca en ${daysLeft} ${daysLeft === 1 ? 'día' : 'días'} - ${BRAND}`,
      title: 'Renueva el sello de tu empresa',
      intro: `La verificación de ${organizationName} caduca el ${date}. Puedes solicitar la renovación desde tu panel: vuelve a aportar la documentación obligatoria y al menos un proyecto con evidencia. Si no la renuevas, el sello dejará de mostrarse como verificado.`,
      action: 'Renovar verificación',
      link: `${this.frontendUrl}/app/sello`,
    });
  }

  /** Aviso al equipo de soporte de un ticket nuevo. */
  async sendSupportTicketCreated(
    to: string,
    subject: string,
    organizationName: string,
    ticketId: string,
  ): Promise<void> {
    const link = `${this.frontendUrl}/admin/soporte?ticket=${encodeURIComponent(ticketId)}`;
    await this.send({
      code: 'support_ticket_created',
      category: 'notification',
      kind: 'nuevo ticket de soporte',
      vars: { organization: organizationName, ticket: subject },
      to,
      subject: `Nuevo ticket de soporte: ${subject} - ${BRAND}`,
      title: `Nuevo ticket de ${organizationName}`,
      intro: `${organizationName} ha abierto un ticket: "${subject}". Revísalo y responde desde el panel de soporte.`,
      action: 'Abrir ticket',
      link,
    });
  }

  /** Aviso de una nueva respuesta en un ticket (empresa o soporte). */
  async sendSupportTicketReply(
    to: string,
    subject: string,
    organizationName: string,
    ticketId: string,
    fromSupport: boolean,
  ): Promise<void> {
    const base = fromSupport ? 'dashboard/soporte' : 'admin/soporte';
    const link = `${this.frontendUrl}/${base}?ticket=${encodeURIComponent(ticketId)}`;
    await this.send({
      code: 'support_ticket_reply',
      category: 'notification',
      kind: 'respuesta de ticket de soporte',
      vars: { organization: organizationName, ticket: subject },
      to,
      subject: `Respuesta a tu ticket: ${subject} - ${BRAND}`,
      title: fromSupport
        ? 'Tienes una respuesta de soporte'
        : `Nueva respuesta de ${organizationName}`,
      intro: fromSupport
        ? `El equipo de soporte ha respondido a "${subject}". Entra para leer el mensaje y continuar la conversación.`
        : `${organizationName} ha respondido en el ticket "${subject}". Revísalo desde el panel de soporte.`,
      action: 'Ver conversación',
      link,
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
      code: opened ? 'resolution_open' : 'resolution_message',
      category: 'notification',
      kind: 'resolucion de incidencia',
      vars: { organization: organizationName },
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
      code: 'case_admin',
      category: 'notification',
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
      code: 'case_company',
      category: 'notification',
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
      code: 'case_client',
      category: 'notification',
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
      code: 'review_notice',
      category: 'notification',
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
  private async send(incoming: MailMessage): Promise<void> {
    const message = await this.withTemplate(incoming);
    if (!message) {
      this.logger.log(`[MAIL][${incoming.kind}] omitido: avisos por correo desactivados`);
      return;
    }
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

  /** Aplica la plantilla editable (si existe) y el interruptor global de avisos. */
  private async withTemplate(message: MailMessage): Promise<MailMessage | null> {
    if (message.category === 'notification') {
      try {
        const enabled = await this.settings.get<boolean>('notifications.email_enabled');
        if (!enabled) {
          return null;
        }
      } catch {
        // Si no se puede leer la configuración, se mantiene el envío.
      }
    }
    try {
      const template = await this.prisma.withContext({ isPlatformAdmin: true }, (tx) =>
        tx.emailTemplate.findUnique({ where: { code: message.code } }),
      );
      if (!template || !template.isActive) {
        return message;
      }
      const vars: Record<string, string> = {
        link: message.link,
        action: message.action,
        site: BRAND,
        ...(message.vars ?? {}),
      };
      return {
        ...message,
        subject: renderTemplate(template.subject, vars),
        title: renderTemplate(template.title, vars),
        intro: renderTemplate(template.intro, vars),
        action: renderTemplate(template.action, vars),
      };
    } catch {
      return message;
    }
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
          <tr><td style="height:4px;background:#2563eb;background-image:linear-gradient(90deg,#2563eb,#0ea5e9);font-size:0;line-height:0;">&nbsp;</td></tr>
          <tr><td style="background:#0b101b;padding:22px 32px;">
            <span style="${font}font-size:20px;font-weight:800;letter-spacing:3px;color:#ffffff;">${BRAND}</span>
            <span style="${font}font-size:12px;color:#94a3b8;padding-left:10px;">Reseñas y reputación</span>
          </td></tr>
          <tr><td style="padding:36px 32px 8px;">
            ${highlight}
            <h1 style="margin:0 0 14px;${font}font-size:24px;line-height:32px;font-weight:700;color:#0f172a;">${title}</h1>
            <p style="margin:0 0 28px;${font}font-size:15px;line-height:24px;color:#475569;">${intro}</p>
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr><td bgcolor="#2563eb" style="border-radius:10px;box-shadow:0 6px 16px rgba(37,99,235,0.28);">
                <a href="${link}" style="display:inline-block;padding:14px 30px;${font}font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">${action} →</a>
              </td></tr>
            </table>
          </td></tr>
          <tr><td style="padding:28px 32px 32px;">
            <p style="margin:0 0 6px;${font}font-size:13px;line-height:20px;color:#64748b;">¿El botón no funciona? Copia y pega este enlace en tu navegador:</p>
            <p style="margin:0 0 24px;${font}font-size:13px;line-height:20px;word-break:break-all;"><a href="${link}" style="color:#2563eb;text-decoration:underline;">${link}</a></p>
            <p style="margin:0;padding-top:20px;border-top:1px solid #e2e8f0;${font}font-size:12px;line-height:18px;color:#94a3b8;">Si no solicitaste este correo, puedes ignorarlo con tranquilidad. Nunca te pediremos tu contraseña por email.</p>
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

function renderTemplate(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => vars[key] ?? '');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
