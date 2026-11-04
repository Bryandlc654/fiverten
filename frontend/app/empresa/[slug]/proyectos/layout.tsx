import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Proyectos y evidencias | FIVERTEN',
  description:
    'Proyectos verificables con evidencias validadas y estado de la verificación de la empresa.',
};

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
