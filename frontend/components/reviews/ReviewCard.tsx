import type { ReactNode } from 'react';
import type { ReviewReply } from '../../lib/api';
import { initialsOf } from '../ui';
import { Stars } from './Stars';

export function formatDate(value: string | null): string {
  if (!value) return '';
  return new Date(value).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

interface ReviewCardProps {
  reviewerName: string;
  rating: number;
  title: string | null;
  body: string;
  date: string | null;
  experienceDate: string | null;
  verified: boolean;
  companyName: string;
  response: ReviewReply | null;
  /** Etiquetas o acciones extra (panel de la empresa). */
  badge?: ReactNode;
  children?: ReactNode;
}

export default function ReviewCard({
  reviewerName,
  rating,
  title,
  body,
  date,
  experienceDate,
  verified,
  companyName,
  response,
  badge,
  children,
}: ReviewCardProps) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">
            {initialsOf(reviewerName)}
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900">{reviewerName}</p>
            <p className="text-xs text-slate-500">{formatDate(date)}</p>
          </div>
        </div>
        {badge}
      </header>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Stars rating={rating} />
        {verified && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-600">
            <span className="material-symbols-outlined text-[14px]">verified</span>
            Experiencia verificada
          </span>
        )}
      </div>
      {title && <h3 className="mt-2 text-base font-bold text-slate-900">{title}</h3>}
      <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-700">{body}</p>
      {experienceDate && (
        <p className="mt-2 text-xs text-slate-400">
          Fecha de la experiencia: {formatDate(experienceDate)}
        </p>
      )}

      {response && (
        <div className="mt-4 rounded-lg border-l-4 border-[#2563eb] bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold text-slate-900">
            Respuesta de {companyName}
            <span className="ml-2 font-normal text-slate-400">
              {formatDate(response.editedAt ?? response.createdAt)}
            </span>
          </p>
          <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{response.body}</p>
        </div>
      )}

      {children}
    </article>
  );
}
