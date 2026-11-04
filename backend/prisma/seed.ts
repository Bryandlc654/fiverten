import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as argon2 from '@node-rs/argon2';
import { SETTING_DEFAULTS } from '../src/settings/settings.service';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const email = (process.env.ADMIN_EMAIL ?? 'admin@fiverten.com').trim().toLowerCase();
  const username = process.env.ADMIN_USERNAME ?? 'fiverten-admin';
  const password = process.env.ADMIN_PASSWORD ?? 'Admin12345!';
  const passwordHash = await argon2.hash(password, {
    algorithm: argon2.Algorithm.Argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });

  const existing = await prisma.user.findFirst({ where: { email } });

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        isSuperAdmin: true,
        isFivertenStaff: true,
        isVerified: true,
        isActive: true,
        emailVerifiedAt: existing.emailVerifiedAt ?? new Date(),
      },
    });
  } else {
    await prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
        firstName: 'Administrador',
        lastName: 'General',
        isActive: true,
        isVerified: true,
        isSuperAdmin: true,
        isFivertenStaff: true,
        emailVerifiedAt: new Date(),
      },
    });
  }

  console.log(`Administrador general listo: ${email}`);

  await seedPlatform();
}

/** Planes, catálogos, configuración, plantillas y motivos de moderación. */
async function seedPlatform(): Promise<void> {
  const plans = [
    {
      code: 'free',
      name: 'Free',
      description: 'Perfil público, hasta 50 reseñas y 1 usuario.',
      priceMonthly: 0,
      priceYearly: 0,
      reviewLimit: 50,
      userLimit: 1,
      sortOrder: 10,
      features: { qr: false, resolutions: false, analytics: 'basic', widgets: false },
    },
    {
      code: 'starter',
      name: 'Starter',
      description: '500 reseñas, 3 usuarios, QR, respuestas y resolución de incidencias.',
      priceMonthly: 29,
      priceYearly: 290,
      reviewLimit: 500,
      userLimit: 3,
      sortOrder: 20,
      features: { qr: true, resolutions: true, analytics: 'standard', widgets: false },
    },
    {
      code: 'business',
      name: 'Business',
      description: '2.000 reseñas, 10 usuarios, analítica avanzada y widgets.',
      priceMonthly: 99,
      priceYearly: 990,
      reviewLimit: 2000,
      userLimit: 10,
      sortOrder: 30,
      features: { qr: true, resolutions: true, analytics: 'advanced', widgets: true },
    },
    {
      code: 'enterprise',
      name: 'Enterprise',
      description: 'Sin límites, API, integraciones y soporte prioritario.',
      priceMonthly: 0,
      priceYearly: 0,
      reviewLimit: null,
      userLimit: null,
      sortOrder: 40,
      features: {
        qr: true,
        resolutions: true,
        analytics: 'advanced',
        widgets: true,
        api: true,
        prioritySupport: true,
      },
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { code: plan.code },
      update: {
        name: plan.name,
        description: plan.description,
        priceMonthly: plan.priceMonthly,
        priceYearly: plan.priceYearly,
        reviewLimit: plan.reviewLimit,
        userLimit: plan.userLimit,
        sortOrder: plan.sortOrder,
        features: plan.features,
        isActive: true,
        isPublic: true,
      },
      create: {
        code: plan.code,
        name: plan.name,
        description: plan.description,
        priceMonthly: plan.priceMonthly,
        priceYearly: plan.priceYearly,
        reviewLimit: plan.reviewLimit,
        userLimit: plan.userLimit,
        sortOrder: plan.sortOrder,
        features: plan.features,
      },
    });
  }

  const sectors = [
    ['tecnologia', 'Tecnología'],
    ['salud', 'Salud'],
    ['educacion', 'Educación'],
    ['retail', 'Comercio y retail'],
    ['hosteleria', 'Hostelería y turismo'],
    ['servicios', 'Servicios profesionales'],
  ] as const;
  for (const [slug, name] of sectors) {
    await prisma.sector.upsert({
      where: { slug },
      update: { name, isActive: true },
      create: { slug, name },
    });
  }

  const countries = [
    ['ES', 'España'],
    ['MX', 'México'],
    ['CO', 'Colombia'],
    ['AR', 'Argentina'],
    ['CL', 'Chile'],
    ['PE', 'Perú'],
    ['US', 'Estados Unidos'],
  ] as const;
  for (const [iso2, name] of countries) {
    await prisma.country.upsert({
      where: { iso2 },
      update: { name, isActive: true },
      create: { iso2, name },
    });
  }

  const languages = [
    ['es', 'Español', 10],
    ['en', 'English', 20],
    ['pt', 'Português', 30],
  ] as const;
  for (const [code, name, sortOrder] of languages) {
    await prisma.language.upsert({
      where: { code },
      update: { name, sortOrder, isActive: true },
      create: { code, name, sortOrder },
    });
  }

  for (const [key, definition] of Object.entries(SETTING_DEFAULTS)) {
    await prisma.platformSetting.upsert({
      where: { key },
      update: {},
      create: { key, value: definition.value, description: definition.description },
    });
  }

  const templates = [
    {
      code: 'email_verification',
      subject: 'Verifica tu correo en {{site}}',
      title: 'Confirma tu dirección de correo',
      intro:
        'Gracias por registrarte en {{site}}. Confirma tu correo para activar tu cuenta.',
      action: 'Verificar mi correo',
    },
    {
      code: 'password_reset',
      subject: 'Recupera tu contraseña - {{site}}',
      title: 'Restablece tu contraseña',
      intro: 'Recibimos una solicitud para restablecer tu contraseña.',
      action: 'Restablecer contraseña',
    },
    {
      code: 'organization_invitation',
      subject: 'Te han invitado a {{organization}} en {{site}}',
      title: 'Únete a {{organization}}',
      intro:
        'Te han invitado a unirte a {{organization}} en {{site}} con el rol "{{role}}". Si no esperabas esta invitación, ignora este correo.',
      action: 'Ver la invitación',
    },
    {
      code: 'review_confirmation',
      subject: 'Confirma tu reseña de {{organization}} - {{site}}',
      title: 'Confirma tu reseña',
      intro:
        'Gracias por compartir tu experiencia con {{organization}}. Confirma tu correo para que publiquemos tu reseña.',
      action: 'Confirmar y publicar',
    },
    {
      code: 'review_request',
      subject: '{{organization}} te invita a contar tu experiencia - {{site}}',
      title: 'Hola {{name}}, ¿cómo fue tu experiencia con {{organization}}?',
      intro:
        '{{organization}} te ha enviado un enlace personal para valorar tu experiencia. El enlace caduca en {{days}} días y solo puede usarse una vez.',
      action: 'Dejar mi reseña',
    },
  ];
  for (const template of templates) {
    await prisma.emailTemplate.upsert({
      where: { code: template.code },
      update: {},
      create: { ...template, isActive: true },
    });
  }

  const reasons = [
    ['spam', 'Spam o publicidad'],
    ['offensive', 'Contenido ofensivo'],
    ['personal_info', 'Información personal'],
    ['conflict', 'Conflicto de intereses'],
    ['not_real', 'No corresponde a una experiencia real'],
    ['advertising', 'Publicidad'],
    ['illegal', 'Contenido ilegal'],
    ['other', 'Otro'],
  ] as const;
  for (let index = 0; index < reasons.length; index += 1) {
    const [code, label] = reasons[index];
    await prisma.reportReason.upsert({
      where: { code },
      update: { label, isActive: true, sortOrder: index * 10 },
      create: { code, label, sortOrder: index * 10 },
    });
  }

  console.log('Planes, catálogos, configuración y plantillas listos');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
