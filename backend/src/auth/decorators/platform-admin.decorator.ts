import { SetMetadata } from '@nestjs/common';

export const PLATFORM_ADMIN_KEY = 'require_platform_admin';

/**
 * Restringe el acceso al personal de FIVERTEN.
 * - actualmente solo `isSuperAdmin` (administrador general).
 */
export const PlatformAdmin = () => SetMetadata(PLATFORM_ADMIN_KEY, true);
