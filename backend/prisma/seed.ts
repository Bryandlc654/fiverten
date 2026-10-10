import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as argon2 from '@node-rs/argon2';

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
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
