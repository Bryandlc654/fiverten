import type { ReactNode } from 'react';

// Piezas visuales compartidas por los paneles (tenant y super admin).

export const inputClass =
  'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500';

const ALERT_TONES = {
  error: 'border-red-200 bg-red-50 text-red-700',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  info: 'border-blue-200 bg-blue-50 text-blue-700',
} as const;

export function Alert({
  tone,
  className = '',
  children,
}: {
  tone: keyof typeof ALERT_TONES;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${ALERT_TONES[tone]} ${className}`}>
      {children}
    </div>
  );
}

export function Badge({ label, tone }: { label: string; tone: string }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}>
      {label}
    </span>
  );
}

export function LoadingRow({ label }: { label: string }) {
  return <div className="flex items-center gap-3 px-5 py-8 text-sm text-slate-500">{label}</div>;
}

export function EmptyRow({ label }: { label: string }) {
  return <div className="px-5 py-8 text-sm text-slate-500">{label}</div>;
}

export function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={className}>
      <span className="mb-1 block text-xs font-semibold text-slate-600">{label}</span>
      {children}
    </label>
  );
}

export function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-slate-300"
      />
      <span className="text-sm text-slate-700">{label}</span>
    </label>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone,
}: {
  label: string;
  value: number | string | undefined;
  hint: string;
  icon: string;
  tone: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${tone}`}>
          <span className="material-symbols-outlined text-[20px]">{icon}</span>
        </span>
        <span className="text-xs text-slate-400">{hint}</span>
      </div>
      <p className="mt-3 text-2xl font-bold text-slate-900">{value ?? '—'}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}

export function initialsOf(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
