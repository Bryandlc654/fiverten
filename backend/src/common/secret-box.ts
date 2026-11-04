// Cifrado simetrico del secreto TOTP en reposo (AES-256-GCM).
//
// La clave se toma de MFA_ENCRYPTION_KEY; si no esta definida se deriva de
// JWT_ACCESS_SECRET para no obligar a configurar otra variable en desarrollo.
// En produccion se recomienda definir MFA_ENCRYPTION_KEY (>=32 caracteres).

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

const IV_BYTES = 12;
const TAG_BYTES = 16;

function key(): Buffer {
  const raw = process.env.MFA_ENCRYPTION_KEY?.trim() || process.env.JWT_ACCESS_SECRET || '';
  return createHash('sha256').update(`fiverten-mfa:${raw}`).digest();
}

/** Devuelve base64url(iv | tag | ciphertext). */
export function encryptSecret(plain: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString('base64url');
}

export function decryptSecret(encoded: string): string {
  const raw = Buffer.from(encoded, 'base64url');
  if (raw.length <= IV_BYTES + TAG_BYTES) {
    throw new Error('Secreto MFA invalido');
  }
  const iv = raw.subarray(0, IV_BYTES);
  const tag = raw.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const ciphertext = raw.subarray(IV_BYTES + TAG_BYTES);
  const decipher = createDecipheriv('aes-256-gcm', key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}
