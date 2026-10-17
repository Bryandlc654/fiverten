import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { slugify, slugifyUsername } from './ids';

export async function buildUniqueSlug(tx: Prisma.TransactionClient, name: string): Promise<string> {
  const base = slugify(name) || 'organizacion';
  let slug = base;
  let attempt = 0;
  while (await tx.organization.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
    if (++attempt > 6) {
      throw new BadRequestException('No se pudo generar un identificador único');
    }
  }
  return slug;
}

export async function buildUniqueUsername(
  tx: Prisma.TransactionClient,
  email: string,
): Promise<string> {
  const base = slugifyUsername(email).slice(0, 80);
  let username = base;
  let attempt = 0;
  while (await tx.user.findUnique({ where: { username }, select: { id: true } })) {
    username = `${base}${Math.floor(Math.random() * 90000)}`;
    if (++attempt > 6) {
      throw new BadRequestException('No se pudo generar un nombre de usuario único');
    }
  }
  return username;
}
