import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Documentación verificada | FIVERTEN',
  description:
    'Estado de verificación y categorías documentales comprobadas, sin exponer documentos privados.',
};

export default function DocumentationLayout({ children }: { children: React.ReactNode }) {
  return children;
}
