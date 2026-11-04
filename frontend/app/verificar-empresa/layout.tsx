import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Verifica tu empresa | FIVERTEN',
  description:
    'Solicita el sello de empresa verificada. Revisión documental, evidencias de actividad y sello dinámico.',
};

export default function VerifyCompanyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
