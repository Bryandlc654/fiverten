/**
 * Normaliza un texto a slug, igual que el backend (backend/src/common/ids.ts):
 * sin acentos, minúsculas, separado por guiones y sin guiones en los extremos.
 */
export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 160);
}
