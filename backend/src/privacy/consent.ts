import type { Prisma } from '@prisma/client';

export const CONSENT_VERSION = '2026-11';

export interface ConsentInput {
  organizationId?: string | null;
  userId?: string | null;
  subjectType: 'review' | 'verification_inquiry' | 'client_relation' | 'account';
  subjectId?: string | null;
  email?: string | null;
  type: 'review_publication' | 'verification_inquiry' | 'client_relation' | 'terms';
  granted: boolean;
  textHash?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/** Registra una prueba de consentimiento dentro de la transacción del alta. */
export async function recordConsent(
  tx: Prisma.TransactionClient,
  input: ConsentInput,
): Promise<void> {
  await tx.consentRecord.create({
    data: {
      organizationId: input.organizationId ?? null,
      userId: input.userId ?? null,
      subjectType: input.subjectType,
      subjectId: input.subjectId ?? null,
      email: input.email ? input.email.trim().toLowerCase() : null,
      type: input.type,
      version: CONSENT_VERSION,
      granted: input.granted,
      textHash: input.textHash ?? null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent?.slice(0, 500) ?? null,
    },
  });
}
