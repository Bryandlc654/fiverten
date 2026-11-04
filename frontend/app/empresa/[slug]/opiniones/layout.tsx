import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Opiniones de clientes | FIVERTEN',
  description:
    'Experiencias de clientes, con reseñas verificadas y vinculadas a proyectos cuando existe evidencia.',
};

export default function ReviewsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
