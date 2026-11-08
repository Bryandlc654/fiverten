'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Imagen clicable que se amplía en un modal accesible.
 * Cierra con Escape, con el botón de cerrar o pulsando fuera de la imagen.
 */
export default function ZoomableImage({
  src,
  alt,
  sizes,
  priority,
  containerClassName,
  imageClassName,
}: {
  src: string;
  alt: string;
  sizes?: string;
  priority?: boolean;
  containerClassName?: string;
  imageClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
      trigger?.focus();
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Ampliar imagen: ${alt}`}
        className={`group cursor-zoom-in ${containerClassName ?? 'relative block h-full w-full'}`}
      >
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className={imageClassName}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-slate-950/60 text-white opacity-0 shadow-sm backdrop-blur-sm transition group-hover:opacity-100"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m16 16 4 4M11 8v6M8 11h6" />
          </svg>
        </span>
      </button>

      {open &&
        createPortal(
          <div
            role="presentation"
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label={alt}
              className="relative flex max-h-full w-full max-w-6xl items-center justify-center"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar imagen"
                className="absolute -top-11 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={alt}
                className="max-h-[85vh] max-w-full rounded-lg object-contain shadow-2xl"
              />
              <p className="absolute -bottom-8 left-0 right-0 truncate text-center text-xs text-slate-300">
                {alt}
              </p>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
