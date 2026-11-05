import type { Metadata } from 'next';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { slug } = await params;
  const name = slug.replace(/-/g, ' ');
  return {
    title: `${name} | FIVERTEN`,
    description:
      'Perfil público con verificación, documentación comprobada, proyectos, certificaciones y opiniones de clientes.',
  };
}

export default function CompanyLayout({ children }: LayoutProps) {
  return children;
}
