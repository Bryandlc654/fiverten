import { BadRequestException, StreamableFile } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';

export const CASE_MAX_FILES = 5;
export const CASE_MAX_FILE_BYTES = 5 * 1024 * 1024;

export interface UploadedEvidence {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname: string;
}

/** Firmas binarias: el tipo que declara el navegador no basta para fiarse. */
const SIGNATURES: Record<string, (data: Buffer) => boolean> = {
  'image/jpeg': (d) => d[0] === 0xff && d[1] === 0xd8 && d[2] === 0xff,
  'image/png': (d) =>
    d.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  'image/webp': (d) =>
    d.toString('ascii', 0, 4) === 'RIFF' && d.toString('ascii', 8, 12) === 'WEBP',
  'application/pdf': (d) => d.toString('ascii', 0, 5) === '%PDF-',
};

/** Interceptor de subida: hasta 5 archivos de 5 MB en el campo "files". */
export const EvidenceUpload = FilesInterceptor('files', CASE_MAX_FILES, {
  limits: { fileSize: CASE_MAX_FILE_BYTES, files: CASE_MAX_FILES },
});

/** Comprueba tipo y contenido de cada archivo; lanza 400 si alguno no vale. */
export function validateEvidence(files: UploadedEvidence[] | undefined): UploadedEvidence[] {
  const list = files ?? [];
  for (const file of list) {
    const matches = SIGNATURES[file.mimetype];
    if (!matches || !matches(file.buffer)) {
      throw new BadRequestException(
        `"${safeFilename(file.originalname)}" no es válido. Usa imágenes JPG, PNG o WEBP, o PDF.`,
      );
    }
  }
  return list;
}

/** Nombre seguro para guardar y descargar (multer entrega el nombre en latin1). */
export function safeFilename(name: string): string {
  const decoded = Buffer.from(name, 'latin1').toString('utf8');
  const cleaned = decoded.replace(/[\/:*?"<>|\u0000-\u001f]+/g, '_').trim();
  return (cleaned || 'evidencia').slice(0, 200);
}

/** Descarga como adjunto: nunca se interpreta en el navegador desde la API. */
export function evidenceResponse(
  res: Response,
  file: { filename: string; mimeType: string; data: Uint8Array },
): StreamableFile {
  res.set({
    'Content-Type': file.mimeType,
    'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(file.filename)}`,
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'private, no-store',
  });
  return new StreamableFile(Buffer.from(file.data));
}
