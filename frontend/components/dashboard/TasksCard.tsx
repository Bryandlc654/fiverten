import Link from 'next/link';
import type { OrganizationDetail, OrganizationStats } from '../../lib/api';

interface Task {
  label: string;
  done: boolean;
  href: string;
}

/** Pasos para completar el perfil, calculados con los datos reales de la empresa. */
function buildTasks(org: OrganizationDetail, stats: OrganizationStats): Task[] {
  return [
    {
      label: 'Completa los datos fiscales de la empresa',
      done: Boolean(org.legalName && org.taxId),
      href: '/app/perfil',
    },
    {
      label: 'Añade una descripción y una portada',
      done: Boolean(org.description && org.coverUrl),
      href: '/app/perfil',
    },
    { label: 'Publica tu perfil público', done: org.isPublic, href: '/app/perfil' },
    {
      label: 'Consigue tu primera reseña',
      done: stats.rating.total > 0,
      href: '/app/opiniones',
    },
    {
      label: 'Responde a todas tus reseñas',
      done: stats.responses.published > 0 && stats.responses.answered === stats.responses.published,
      href: '/app/opiniones?answered=no',
    },
    {
      label: 'Obtén el sello de empresa verificada',
      done: org.verificationStatus === 'verified',
      href: '/app/perfil',
    },
  ];
}

export default function TasksCard({
  org,
  stats,
}: {
  org: OrganizationDetail | null;
  stats: OrganizationStats | null;
}) {
  if (!org || !stats) {
    return <div className="h-72 animate-pulse rounded-xl border border-slate-200 bg-white" />;
  }
  const tasks = buildTasks(org, stats);
  const completed = tasks.filter((task) => task.done).length;

  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-slate-900">Tareas pendientes</h3>
        <span className="text-xs font-semibold text-slate-500">
          {completed}/{tasks.length}
        </span>
      </div>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-blue-600 transition-all"
          style={{ width: `${(completed / tasks.length) * 100}%` }}
        />
      </div>
      <ul className="mt-4 space-y-1">
        {tasks.map((task) => (
          <li key={task.label}>
            <Link
              href={task.href}
              className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-slate-50"
            >
              <span
                className={`material-symbols-outlined text-[20px] ${
                  task.done ? 'text-emerald-500' : 'text-slate-300'
                }`}
              >
                {task.done ? 'check_circle' : 'radio_button_unchecked'}
              </span>
              <span
                className={`text-sm ${task.done ? 'text-slate-400 line-through' : 'text-slate-700'}`}
              >
                {task.label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
