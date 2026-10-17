import * as argon2 from '@node-rs/argon2';
import * as bcrypt from 'bcryptjs';

const ARGON2_OPTIONS = {
  algorithm: argon2.Algorithm.Argon2id,
  memoryCost: 19456, // 19 MiB (recomendacion OWASP)
  timeCost: 2,
  parallelism: 1,
};

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<{ valid: boolean; needsRehash: boolean }> {
  if (!storedHash) {
    return { valid: false, needsRehash: false };
  }
  if (storedHash.startsWith('$argon2')) {
    try {
      return { valid: await argon2.verify(storedHash, password), needsRehash: false };
    } catch {
      return { valid: false, needsRehash: false };
    }
  }
  // Compatibilidad con hashes legacy bcrypt (bcryptjs): se valida y se re-hashea a Argon2id.
  if (storedHash.startsWith('$2')) {
    const valid = await bcrypt.compare(password, storedHash);
    return { valid, needsRehash: valid };
  }
  return { valid: false, needsRehash: false };
}

// Hash ficticio con los mismos parametros que los reales. Se verifica contra el
// cuando el usuario no existe para que el login tarde lo mismo en ambos casos
// y el tiempo de respuesta no permita adivinar que correos estan registrados.
let dummyHash: Promise<string> | null = null;

export async function burnPasswordCheck(password: string): Promise<void> {
  dummyHash ??= hashPassword('fiverten-timing-equalizer');
  await verifyPassword(password, await dummyHash);
}
