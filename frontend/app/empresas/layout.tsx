import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Directorio de empresas verificadas | FIVERTEN',
  description:
    'Busca y filtra empresas verificadas por sector, país y estado de verificación. Consulta su reputación y opiniones reales.',
};

export default function EmpresasLayout({ children }: { children: React.ReactNode }) {
  return children;
}
