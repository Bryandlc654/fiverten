import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'crypto';
import { connect, type Socket } from 'net';

const IV_BYTES = 12;
const TAG_BYTES = 16;
const MAGIC = Buffer.from('FTE1');
export const FILE_ENCRYPTION_VERSION = 1;

const SIGNATURES: Record<string, (data: Buffer) => boolean> = {
  'application/pdf': (data) => data.toString('ascii', 0, 5) === '%PDF-',
  'image/jpeg': (data) => data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff,
  'image/png': (data) =>
    data
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  'image/webp': (data) =>
    data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP',
  'image/gif': (data) => ['GIF87a', 'GIF89a'].includes(data.toString('ascii', 0, 6)),
  'image/avif': (data) =>
    data.toString('ascii', 4, 8) === 'ftyp' &&
    ['avif', 'avis', 'heic', 'heix'].includes(data.toString('ascii', 8, 12)),
};

export interface UploadLike {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname: string;
}

export function hashBuffer(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

export function validateFileSignature(file: UploadLike): void {
  const check = SIGNATURES[file.mimetype];
  if (!check || !check(file.buffer)) {
    throw new BadRequestException(
      `El archivo "${file.originalname}" no coincide con el tipo declarado o no está permitido.`,
    );
  }
}

function encryptionKey(): Buffer {
  const raw = process.env.FILE_ENCRYPTION_KEY?.trim() || process.env.JWT_ACCESS_SECRET || '';
  return createHash('sha256').update(`fiverten-files:${raw}`).digest();
}

/** Cifra con AES-256-GCM y devuelve un contenedor versionado FTE1. */
export function encryptFile(buffer: Buffer): Buffer {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([MAGIC, iv, tag, ciphertext]);
}

/** Descifra un archivo cifrado. Los archivos antiguos (version 0) se devuelven tal cual. */
export function decryptFile(buffer: Buffer, version: number): Buffer {
  if (version < FILE_ENCRYPTION_VERSION) return buffer;
  if (!buffer.subarray(0, 4).equals(MAGIC)) {
    throw new Error('Contenedor de archivo no válido');
  }
  const iv = buffer.subarray(4, 4 + IV_BYTES);
  const tag = buffer.subarray(4 + IV_BYTES, 4 + IV_BYTES + TAG_BYTES);
  const ciphertext = buffer.subarray(4 + IV_BYTES + TAG_BYTES);
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

function clamAvScan(buffer: Buffer): Promise<'clean' | 'infected'> {
  const host = process.env.CLAMAV_HOST?.trim();
  const port = Number(process.env.CLAMAV_PORT ?? 3310);
  if (!host) {
    if ((process.env.UPLOAD_SCAN_REQUIRED ?? '').toLowerCase() === 'true') {
      return Promise.reject(
        new ServiceUnavailableException('El escaneo de archivos no está disponible'),
      );
    }
    return Promise.resolve('clean');
  }

  return new Promise((resolve, reject) => {
    const socket: Socket = connect({ host, port });
    let response = '';
    const timeout = setTimeout(() => {
      socket.destroy();
      reject(new ServiceUnavailableException('El escaneo de archivos ha caducado'));
    }, 10_000);

    socket.on('connect', () => {
      socket.write('zINSTREAM\0');
      for (let offset = 0; offset < buffer.length; offset += 64 * 1024) {
        const chunk = buffer.subarray(offset, offset + 64 * 1024);
        const size = Buffer.alloc(4);
        size.writeUInt32BE(chunk.length, 0);
        socket.write(size);
        socket.write(chunk);
      }
      socket.write(Buffer.alloc(4));
    });
    socket.on('data', (chunk) => {
      response += chunk.toString('utf8');
    });
    socket.on('error', (error) => {
      clearTimeout(timeout);
      reject(
        new ServiceUnavailableException(`No se pudo escanear el archivo: ${error.message}`),
      );
    });
    socket.on('close', () => {
      clearTimeout(timeout);
      if (response.includes('FOUND')) resolve('infected');
      else if (response.includes('OK')) resolve('clean');
      else reject(new ServiceUnavailableException('Respuesta de escaneo no válida'));
    });
  });
}

export async function scanFile(buffer: Buffer): Promise<'clean' | 'not_scanned'> {
  const configured = Boolean(process.env.CLAMAV_HOST?.trim());
  const result = await clamAvScan(buffer);
  if (result === 'infected') {
    throw new BadRequestException('El archivo contiene malware o contenido no permitido');
  }
  return configured ? 'clean' : 'not_scanned';
}

export async function secureFile(file: UploadLike): Promise<{
  data: Buffer;
  encryptionVersion: number;
  scanStatus: 'clean' | 'not_scanned';
  hash: string;
  size: number;
}> {
  validateFileSignature(file);
  const scanStatus = await scanFile(file.buffer);
  return {
    data: encryptFile(file.buffer),
    encryptionVersion: FILE_ENCRYPTION_VERSION,
    scanStatus,
    hash: hashBuffer(file.buffer),
    size: file.buffer.length,
  };
}
