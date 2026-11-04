import type { Metadata } from 'next';

interface LayoutProps {
  children: React.ReactNode;
  params: { slug: string };
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const name = params.slug.replace(/-/g, ' ');
  return {
    title: `${name} | FIVERTEN`,
    description:
      'Perfil público con verificación, documentación comprobada, proyectos, certificaciones y opiniones de clientes.',
  };
}

export default function CompanyLayout({ children }: LayoutProps) {
  return children;
}
