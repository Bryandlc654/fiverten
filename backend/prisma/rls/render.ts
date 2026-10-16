// ============================================================================
// Regenera prisma/rls/setup.sql a partir de setup-statements.ts (la fuente).
// Uso: npm run db:rls:sql
// ============================================================================
import { writeFileSync } from 'fs';
import { join } from 'path';
import { rlsStatements } from './setup-statements';

const header = [
  '-- ============================================================================',
  '-- FIVERTEN - Row-Level Security (base de datos del backend)',
  '-- GENERADO desde backend/prisma/rls/setup-statements.ts (npm run db:rls:sql).',
  '-- No editar a mano. Ejecutar como rol propietario:  npm run db:rls',
  '-- ============================================================================',
  '',
].join('\n');

const body = rlsStatements.map((statement) => `${statement.replace(/^ {5}/gm, '  ')};`).join('\n\n');

writeFileSync(join(__dirname, 'setup.sql'), `${header}\n${body}\n`);
console.log(`setup.sql regenerado (${rlsStatements.length} sentencias).`);
