'use client';

import { useState } from 'react';

type SealTab = 'link' | 'widget' | 'qr';

export default function SealCard({
  publicUrl,
  publicId,
}: {
  publicUrl: string;
  publicId: string | undefined;
}) {
  const [activeTab, setActiveTab] = useState<SealTab>('link');

  function copyEmbed() {
    const value =
      activeTab === 'widget'
        ? `<script src="https://fiverten.com/seal/${publicId ?? ''}.js"></script>`
        : publicUrl;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(value);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="text-base font-bold text-slate-900">Sello verificado</h3>
      <p className="text-xs text-slate-500">Inserta tu sello donde quieras</p>

      <div className="mt-4 flex gap-1 rounded-lg bg-slate-100 p-1 text-xs font-medium">
        {[
          { id: 'link', label: 'Enlace' },
          { id: 'widget', label: 'Widget' },
          { id: 'qr', label: 'QR' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as SealTab)}
            className={`flex-1 rounded-md px-2 py-1.5 transition ${
              activeTab === tab.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 py-6">
        <div className="flex items-center gap-2 rounded-lg bg-[#0b101b] px-3 py-2 text-white">
          <span className="material-symbols-outlined text-[20px] text-emerald-400">
            verified
          </span>
          <div className="leading-none">
            <p className="text-[11px] font-bold">FIVERTEN</p>
            <p className="text-[9px] text-slate-400">Empresa verificada</p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
        <span className="material-symbols-outlined text-[16px] text-slate-400">link</span>
        <span className="truncate text-xs text-slate-500">
          {activeTab === 'widget' ? 'Código de inserción HTML' : publicUrl}
        </span>
        <button
          type="button"
          onClick={copyEmbed}
          className="ml-auto shrink-0 rounded-md bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-slate-700"
        >
          Copiar
        </button>
      </div>
    </div>
  );
}
