export interface MissingProfileRequirement {
  key: string;
  label: string;
}

interface CompanyProfile {
  legalName: string | null;
  taxId: string | null;
  email: string | null;
  description: string | null;
  isPublic: boolean;
}

/**
 * Datos imprescindibles del perfil para poder solicitar la verificación.
 * No se exigen logo, portada, web o teléfono: son opcionales.
 */
export const REQUIRED_PROFILE_FIELDS = [
  { key: 'legalName', label: 'Razón social' },
  { key: 'taxId', label: 'CIF / NIF' },
  { key: 'email', label: 'Correo de la empresa' },
  { key: 'description', label: 'Descripción' },
] as const;

export function missingProfileRequirements(org: CompanyProfile): MissingProfileRequirement[] {
  const missing: MissingProfileRequirement[] = [];
  for (const field of REQUIRED_PROFILE_FIELDS) {
    const value = org[field.key];
    if (typeof value !== 'string' || !value.trim()) {
      missing.push({ key: field.key, label: field.label });
    }
  }
  if (!org.isPublic) {
    missing.push({ key: 'isPublic', label: 'Activar el perfil público' });
  }
  return missing;
}
