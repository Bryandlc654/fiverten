// Cifra en reposo los archivos existentes que aún están en claro.
// Uso: FILE_ENCRYPTION_KEY=... npm run db:encrypt-files
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { encryptFile, FILE_ENCRYPTION_VERSION } from '../src/common/file-security';

const prisma = new PrismaClient();

async function encryptDocuments(): Promise<number> {
  const rows = await prisma.verificationDocument.findMany({
    where: { encryptionVersion: 0 },
    select: { id: true, data: true },
  });
  for (const row of rows) {
    await prisma.verificationDocument.update({
      where: { id: row.id },
      data: {
        data: encryptFile(Buffer.from(row.data)),
        encryptionVersion: FILE_ENCRYPTION_VERSION,
      },
    });
  }
  return rows.length;
}

async function encryptMedia(): Promise<number> {
  const rows = await prisma.mediaFile.findMany({
    where: { encryptionVersion: 0 },
    select: { id: true, data: true },
  });
  for (const row of rows) {
    await prisma.mediaFile.update({
      where: { id: row.id },
      data: {
        data: encryptFile(Buffer.from(row.data)),
        encryptionVersion: FILE_ENCRYPTION_VERSION,
      },
    });
  }
  return rows.length;
}

async function encryptCaseFiles(): Promise<number> {
  const rows = await prisma.reviewCaseFile.findMany({
    where: { encryptionVersion: 0 },
    select: { id: true, data: true },
  });
  for (const row of rows) {
    await prisma.reviewCaseFile.update({
      where: { id: row.id },
      data: {
        data: encryptFile(Buffer.from(row.data)),
        encryptionVersion: FILE_ENCRYPTION_VERSION,
      },
    });
  }
  return rows.length;
}

async function main(): Promise<void> {
  const [documents, media, caseFiles] = await Promise.all([
    encryptDocuments(),
    encryptMedia(),
    encryptCaseFiles(),
  ]);
  console.log(
    `Archivos cifrados: verification_documents=${documents}, media_files=${media}, review_case_files=${caseFiles}`,
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
