import Link from 'next/link';

const TABS = [
  { key: 'resumen', label: 'Resumen', path: '' },
  { key: 'documentacion', label: 'Documentación', path: '/documentacion' },
  { key: 'proyectos', label: 'Proyectos', path: '/proyectos' },
  { key: 'opiniones', label: 'Opiniones', path: '/opiniones' },
  { key: 'certificaciones', label: 'Certificaciones', path: '/certificaciones' },
];

export default function CompanyPublicNav({
  slug,
  active,
}: {
  slug: string;
  active: string;
}) {
  return (
    <nav className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 text-xs font-semibold">
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={`/empresa/${slug}${tab.path}`}
          className={`shrink-0 rounded-lg px-3 py-2 transition ${
            active === tab.key
              ? 'bg-[#0b101b] text-white'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
