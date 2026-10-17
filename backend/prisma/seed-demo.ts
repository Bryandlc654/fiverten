// ============================================================================
// Datos de demostración: una empresa pública con reseñas variadas (distintas
// fechas, puntuaciones y respuestas) para enseñar el perfil público.
// Uso: npm run db:seed:demo   (se puede repetir: borra y recrea la demo)
//   DEMO_EMAIL / DEMO_PASSWORD: acceso del propietario de la empresa demo.
// ============================================================================
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { generatePublicId } from '../src/common/ids';
import { hashPassword } from '../src/common/passwords';
import { ensureAllSystemRoles, ensureSystemRole } from '../src/common/system-roles';

const prisma = new PrismaClient();

const SLUG = 'clinica-dental-sonrisa';
const DAY = 24 * 60 * 60 * 1000;

interface DemoReview {
  name: string;
  rating: number;
  title: string;
  body: string;
  daysAgo: number;
  response?: string;
}

const REVIEWS: DemoReview[] = [
  {
    name: 'Lucía Fernández Gil',
    rating: 5,
    title: 'Sin miedo al dentista por fin',
    body: 'Llevaba años evitando ir al dentista y aquí me trataron con muchísima paciencia. Me explicaron cada paso y no noté nada.',
    daysAgo: 3,
    response: 'Gracias, Lucía. Nos alegra mucho que te hayas sentido tranquila. ¡Te esperamos en la revisión!',
  },
  {
    name: 'Javier Ruiz Morales',
    rating: 2,
    title: 'Mucha espera',
    body: 'El tratamiento bien, pero esperé casi 40 minutos con cita previa y nadie me avisó del retraso.',
    daysAgo: 6,
  },
  {
    name: 'Marta González Pérez',
    rating: 5,
    title: 'Ortodoncia invisible perfecta',
    body: 'Terminé la ortodoncia invisible en el plazo que me dijeron. Seguimiento constante y trato cercano.',
    daysAgo: 12,
    response: 'Marta, ¡qué alegría ver el resultado! Gracias por confiar en nosotros.',
  },
  {
    name: 'Andrés López Vidal',
    rating: 4,
    title: 'Buena limpieza',
    body: 'Limpieza rápida y a fondo. El precio está en la media; repetiré.',
    daysAgo: 21,
  },
  {
    name: 'Carmen Navarro Ruiz',
    rating: 5,
    title: 'Urgencia resuelta en el día',
    body: 'Me dolía una muela un sábado y me atendieron esa misma mañana. Muy agradecida.',
    daysAgo: 35,
    response: 'Para eso estamos, Carmen. Esperamos que ya estés recuperada.',
  },
  {
    name: 'Pablo Martín Sanz',
    rating: 3,
    title: 'Correcto',
    body: 'Profesionales, pero me costó entender el presupuesto. Echo en falta más claridad en los precios.',
    daysAgo: 48,
    response: 'Gracias por el comentario, Pablo. Ya estamos preparando presupuestos más detallados.',
  },
  {
    name: 'Elena Romero Díaz',
    rating: 5,
    title: 'Mis hijos encantados',
    body: 'Llevo a mis dos hijos y salen contentos. La doctora tiene un don con los niños.',
    daysAgo: 70,
  },
  {
    name: 'Sergio Castro León',
    rating: 4,
    title: 'Implante sin complicaciones',
    body: 'El implante quedó muy bien. Solo pondría pegas a lo difícil que es aparcar cerca.',
    daysAgo: 95,
  },
  {
    name: 'Isabel Ortega Muñoz',
    rating: 1,
    title: 'Cancelaron mi cita',
    body: 'Me cancelaron la cita el mismo día y tardaron una semana en darme otra.',
    daysAgo: 130,
    response: 'Isabel, lamentamos mucho lo ocurrido. Tuvimos una baja imprevista; te hemos escrito para compensarte.',
  },
  {
    name: 'Raúl Jiménez Prieto',
    rating: 5,
    title: 'Blanqueamiento',
    body: 'Resultado natural, nada exagerado. Me dieron indicaciones claras para mantenerlo.',
    daysAgo: 180,
  },
  {
    name: 'Nuria Herrera Blanco',
    rating: 4,
    title: 'Trato amable',
    body: 'Recepción muy amable y consulta puntual. Instalaciones modernas.',
    daysAgo: 240,
  },
  {
    name: 'Diego Molina Campos',
    rating: 5,
    title: 'Recomendable al 100%',
    body: 'Me hicieron una endodoncia y fue mucho más llevadera de lo que esperaba.',
    daysAgo: 300,
  },
  {
    name: 'Rosa Delgado Ibáñez',
    rating: 3,
    title: 'Bien, sin más',
    body: 'Cumplieron con lo que necesitaba, aunque la clínica estaba algo saturada.',
    daysAgo: 390,
  },
  {
    name: 'Tomás Vega Serrano',
    rating: 5,
    title: 'Años de confianza',
    body: 'Vengo desde hace años con toda la familia. Siempre igual de profesionales.',
    daysAgo: 420,
    response: '¡Gracias, Tomás! Es un placer cuidar de toda la familia.',
  },
];

async function main(): Promise<void> {
  const email = (process.env.DEMO_EMAIL ?? 'demo@clinica-sonrisa.test').trim().toLowerCase();
  const password = process.env.DEMO_PASSWORD ?? 'Demo12345!';

  // Reinicio limpio de la demo (las reseñas y membresías caen en cascada).
  await prisma.organization.deleteMany({ where: { slug: SLUG } });
  await prisma.user.deleteMany({ where: { email } });

  const org = await prisma.organization.create({
    data: {
      publicId: generatePublicId(),
      tradeName: 'Clínica Dental Sonrisa',
      legalName: 'Clínica Dental Sonrisa S.L.',
      slug: SLUG,
      description:
        'Clínica dental familiar en el centro de Madrid. Odontología general, ortodoncia invisible, implantes y odontopediatría desde 2009.',
      website: 'https://clinica-sonrisa.example',
      email: 'hola@clinica-sonrisa.example',
      phone: '+34 910 000 000',
      status: 'active',
      isActive: true,
      isPublic: true,
      allowContact: true,
      verificationStatus: 'verified',
      verifiedAt: new Date(),
    },
  });
  await ensureAllSystemRoles(prisma, org.id);
  const ownerRole = await ensureSystemRole(prisma, org.id, 'admin');

  const owner = await prisma.user.create({
    data: {
      email,
      username: `demo-sonrisa-${Date.now().toString(36)}`,
      passwordHash: await hashPassword(password),
      firstName: 'Ana',
      lastName: 'Sonrisa',
      defaultOrganizationId: org.id,
      isActive: true,
      isVerified: true,
      emailVerifiedAt: new Date(),
    },
  });
  await prisma.organizationMembership.create({
    data: { organizationId: org.id, userId: owner.id, roleId: ownerRole.id, isOwner: true },
  });

  for (const [index, item] of REVIEWS.entries()) {
    const publishedAt = new Date(Date.now() - item.daysAgo * DAY);
    const review = await prisma.review.create({
      data: {
        organizationId: org.id,
        reviewerName: item.name,
        reviewerEmail: `cliente${index + 1}@demo.test`,
        rating: item.rating,
        title: item.title,
        body: item.body,
        experienceDate: new Date(publishedAt.getTime() - 2 * DAY),
        consent: true,
        lifecycleStatus: 'published',
        visibility: 'public',
        emailConfirmedAt: publishedAt,
        publishedAt,
        createdAt: publishedAt,
      },
    });
    if (item.response) {
      await prisma.reviewResponse.create({
        data: {
          reviewId: review.id,
          organizationId: org.id,
          authorUserId: owner.id,
          body: item.response,
          createdAt: new Date(publishedAt.getTime() + DAY),
        },
      });
    }
  }

  console.log(`Demo lista: /empresa/${SLUG} (${REVIEWS.length} reseñas). Acceso: ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
