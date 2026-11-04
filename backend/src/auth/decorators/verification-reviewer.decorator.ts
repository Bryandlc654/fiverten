import { SetMetadata } from '@nestjs/common';

export const VERIFICATION_REVIEWER_KEY = 'verification_reviewer';

/** Exige ser Admin FIVERTEN o Verificador FIVERTEN. */
export const VerificationReviewer = () => SetMetadata(VERIFICATION_REVIEWER_KEY, true);
