// ============================================================================
// Retención de datos operativos.
// Elimina registros antiguos/caducados para evitar crecimiento indefinido.
// Uso: npm run db:retention   (programar periodicamente, p.ej. cron diario)
//   AUTH_ATTEMPTS_RETENTION_DAYS (default 90)
// ============================================================================
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const days = Number(process.env.AUTH_ATTEMPTS_RETENTION_DAYS ?? 90);
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const now = new Date();

  const attempts = await prisma.authAttempt.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
  const verifications = await prisma.emailVerification.deleteMany({
    where: { expiresAt: { lt: now } },
  });
  const resets = await prisma.passwordResetToken.deleteMany({
    where: { expiresAt: { lt: now } },
  });

  console.log(
    `Retención aplicada: auth_attempts(-${days}d)=${attempts.count}, ` +
      `email_verifications(caducados)=${verifications.count}, ` +
      `password_reset_tokens(caducados)=${resets.count}`,
  );
}

void main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
