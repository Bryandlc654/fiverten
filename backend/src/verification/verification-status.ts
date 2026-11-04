export type EffectiveVerificationStatus =
  | 'not_verified'
  | 'pending'
  | 'verified'
  | 'rejected'
  | 'expired';

/** La verificación caduca automáticamente al pasar verificationExpiresAt. */
export function effectiveVerificationStatus(org: {
  verificationStatus: string;
  verificationExpiresAt: Date | null;
}): EffectiveVerificationStatus {
  if (
    org.verificationStatus === 'verified' &&
    org.verificationExpiresAt &&
    org.verificationExpiresAt.getTime() < Date.now()
  ) {
    return 'expired';
  }
  return org.verificationStatus as EffectiveVerificationStatus;
}

export const VERIFICATION_DOCUMENT_CATEGORIES = [
  'identity',
  'tax',
  'address',
  'project',
  'other',
] as const;
