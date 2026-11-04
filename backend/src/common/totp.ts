// Implementacion minima de TOTP (RFC 6238) para la verificacion en dos pasos.
// Sin dependencias externas: usa HMAC-SHA1, el algoritmo que aceptan Google
// Authenticator, Authy, 1Password, etc.

import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const PERIOD_SECONDS = 30;
const DIGITS = 6;

export function generateTotpSecret(bytes = 20): string {
  return base32Encode(randomBytes(bytes));
}

/** Codigo TOTP para un instante concreto (por defecto, ahora). */
export function totpCode(secret: string, at: Date = new Date()): string {
  const counter = Math.floor(at.getTime() / 1000 / PERIOD_SECONDS);
  return hotp(base32Decode(secret), counter);
}

/**
 * Verifica el codigo aceptando una ventana de +/- 1 periodo para tolerar
 * pequenos desfases de reloj entre el telefono y el servidor.
 */
export function verifyTotp(secret: string, code: string, at: Date = new Date()): boolean {
  const normalized = code.replace(/\s+/g, '');
  if (!/^\d{6}$/.test(normalized)) {
    return false;
  }
  const counter = Math.floor(at.getTime() / 1000 / PERIOD_SECONDS);
  const expected = Buffer.from(normalized);
  for (let offset = -1; offset <= 1; offset += 1) {
    const candidate = Buffer.from(hotp(base32Decode(secret), counter + offset));
    if (candidate.length === expected.length && timingSafeEqual(candidate, expected)) {
      return true;
    }
  }
  return false;
}

export function otpauthUrl(issuer: string, account: string, secret: string): string {
  const label = encodeURIComponent(`${issuer}:${account}`);
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: String(DIGITS),
    period: String(PERIOD_SECONDS),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

function hotp(secret: Buffer, counter: number): string {
  const buffer = Buffer.alloc(8);
  buffer.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buffer.writeUInt32BE(counter >>> 0, 4);
  const digest = createHmac('sha1', secret).update(buffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const value =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);
  return String(value % 10 ** DIGITS).padStart(DIGITS, '0');
}

function base32Encode(bytes: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/=+$/, '').replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const output: number[] = [];
  for (const char of clean) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) {
      continue;
    }
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}
