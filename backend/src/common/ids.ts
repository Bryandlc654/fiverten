import { randomInt } from 'crypto';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomBlock(length: number): string {
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += ALPHABET[randomInt(ALPHABET.length)];
  }
  return out;
}

export function generatePublicId(): string {
  return `FT-${randomBlock(5)}-${randomBlock(3)}`;
}

export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 160);
}

export function slugifyUsername(email: string): string {
  const local = email.split('@')[0] ?? 'user';
  const base = local.toLowerCase().replace(/[^a-z0-9._-]/g, '');
  return base.length >= 3 ? base : `user${randomInt(1000, 10000)}`;
}
