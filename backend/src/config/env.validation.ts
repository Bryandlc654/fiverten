// ============================================================================
// Validacion de variables de entorno al arranque.
// Falla rapido si faltan valores obligatorios o si en produccion se usan
// secretos por defecto (placeholder) o contrasenas de base de datos debiles.
// ============================================================================

const DEFAULT_JWT_MARKERS = [/change-?me/i, /placeholder/i, /^secret$/i, /^test-access-secret$/i];

const DEFAULT_DB_CREDENTIALS = [/postgres:postgres@/i, /fiverten_app:fiverten_app@/i, /:CHANGE_ME/i];

const NUMERIC_KEYS = [
  'PORT',
  'JWT_REFRESH_TTL_DAYS',
  'MAX_FAILED_LOGINS',
  'LOCK_MINUTES',
  'EMAIL_VERIFICATION_TTL_HOURS',
  'PASSWORD_RESET_TTL_MINUTES',
];

const BOOLEAN_KEYS = ['DB_RLS_ENABLED', 'REQUIRE_EMAIL_VERIFICATION'];

export function validateEnvironment(config: Record<string, unknown>): Record<string, unknown> {
  const errors: string[] = [];
  const nodeEnv = String(config.NODE_ENV ?? 'development');
  const isProduction = nodeEnv === 'production';

  const accessSecret = String(config.JWT_ACCESS_SECRET ?? '');
  if (!accessSecret) {
    errors.push('JWT_ACCESS_SECRET es obligatorio');
  }

  if (isProduction) {
    const looksDefault =
      accessSecret.length < 32 || DEFAULT_JWT_MARKERS.some((marker) => marker.test(accessSecret));
    if (looksDefault) {
      errors.push(
        'JWT_ACCESS_SECRET debe ser un secreto fuerte (>=32 caracteres, sin placeholders) en produccion',
      );
    }

    for (const key of ['DATABASE_URL', 'APP_DATABASE_URL']) {
      const url = String(config[key] ?? '');
      if (url && DEFAULT_DB_CREDENTIALS.some((marker) => marker.test(url))) {
        errors.push(`${key} usa credenciales por defecto; configura una contrasena fuerte`);
      }
    }

    if (String(config.DB_RLS_ENABLED ?? '').toLowerCase() !== 'true') {
      errors.push('DB_RLS_ENABLED debe ser true en produccion (aislamiento multi-tenant)');
    }
  }

  for (const key of NUMERIC_KEYS) {
    const value = config[key];
    if (value !== undefined && value !== '' && Number.isNaN(Number(value))) {
      errors.push(`${key} debe ser numerico`);
    }
  }

  for (const key of BOOLEAN_KEYS) {
    const value = config[key];
    if (value === undefined || value === '') continue;
    if (!['true', 'false', '1', '0'].includes(String(value).toLowerCase())) {
      errors.push(`${key} debe ser true o false`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Configuracion de entorno invalida:\n- ${errors.join('\n- ')}`);
  }

  return config;
}
