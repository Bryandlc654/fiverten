import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Certificaciones y credenciales | FIVERTEN',
  description:
    'Sello FIVERTEN, categorías documentales comprobadas y certificaciones externas validadas.',
};

export default function CertificationsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
