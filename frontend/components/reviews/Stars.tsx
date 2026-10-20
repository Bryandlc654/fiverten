'use client';

import { useState } from 'react';

const STAR_COLORS = [
  '',
  'text-red-500',
  'text-orange-500',
  'text-amber-400',
  'text-lime-500',
  'text-emerald-500',
];

export const RATING_LABELS: Record<number, string> = {
  1: 'Muy mala',
  2: 'Mala',
  3: 'Normal',
  4: 'Buena',
  5: 'Excelente',
};

/** Media con un decimal y coma: 4 -> "4,0", 4.25 -> "4,3". */
export function formatRating(value: number): string {
  return value.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/** Estrellas de solo lectura (admite medias, p. ej. 4,6). */
export function Stars({ rating, size = 18 }: { rating: number; size?: number }) {
  // Sin valoraciones (0) las estrellas van en gris: el rojo sería "muy mala".
  const color =
    rating <= 0 ? 'text-slate-300' : (STAR_COLORS[Math.round(rating)] ?? 'text-amber-400');
  return (
    <span className={`inline-flex ${color}`} aria-label={`${rating} de 5 estrellas`} role="img">
      {[1, 2, 3, 4, 5].map((index) => (
        <span
          key={index}
          aria-hidden
          className="material-symbols-outlined"
          style={{
            fontSize: size,
            fontVariationSettings: index <= Math.round(rating) ? "'FILL' 1" : "'FILL' 0",
          }}
        >
          star
        </span>
      ))}
    </span>
  );
}

/** Selector de puntuación para el formulario de reseña. */
export function StarPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (rating: number) => void;
}) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="flex items-center gap-3">
      <div
        className="flex"
        role="radiogroup"
        aria-label="Puntuación"
        onMouseLeave={() => setHover(0)}
      >
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            type="button"
            role="radio"
            aria-checked={value === rating}
            aria-label={`${rating} ${rating === 1 ? 'estrella' : 'estrellas'}`}
            onMouseEnter={() => setHover(rating)}
            onClick={() => onChange(rating)}
            className={`p-0.5 transition ${rating <= shown ? STAR_COLORS[shown] : 'text-slate-300'}`}
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: 36,
                fontVariationSettings: rating <= shown ? "'FILL' 1" : "'FILL' 0",
              }}
            >
              star
            </span>
          </button>
        ))}
      </div>
      <span className="text-sm font-semibold text-slate-600">
        {shown ? RATING_LABELS[shown] : ''}
      </span>
    </div>
  );
}
