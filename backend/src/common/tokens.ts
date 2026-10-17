import { createHash, randomBytes } from 'crypto';

/** Token aleatorio en hexadecimal (se entrega al usuario; en BD solo se guarda su hash). */
export function randomToken(bytes: number): string {
  return randomBytes(bytes).toString('hex');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
