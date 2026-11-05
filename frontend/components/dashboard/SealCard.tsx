'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { api } from '../../lib/api';

type SealTab = 'seal' | 'widget' | 'qr';

export default function SealCard({
  publicUrl,
  publicId,
  embedToken,
}: {
  publicUrl: string;
  publicId: string | undefined;
  embedToken?: string | null;
}) {
  const [activeTab, setActiveTab] = useState<SealTab>('seal');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrError, setQrError] = useState(false);
  const [copied, setCopied] = useState(false);

  const origin = typeof window === 'undefined' ? 'https://fiverten.com' : window.location.origin;
  const sealId = embedToken ?? publicId;
  const sealSvgUrl = sealId ? `${origin}/api/seal/${sealId}.svg` : '';
  const sealPngUrl = sealId ? `${origin}/api/seal/${sealId}.png` : '';
  const widgetUrl = sealId ? `${origin}/api/widget/${sealId}.js` : '';
  const sealEmbed = `<a href="${publicUrl}" target="_blank" rel="noopener"><img src="${sealSvgUrl}" alt="Sello FIVERTEN" width="300" height="104"></a>`;
  const widgetEmbed = `<script src="${widgetUrl}" async></script>`;
  const embed =
    activeTab === 'seal' ? sealEmbed : activeTab === 'widget' ? widgetEmbed : publicUrl;

  useEffect(() => {
    if (activeTab !== 'qr') return;
    let active = true;
    QRCode.toDataURL(publicUrl, {
      width: 512,
      margin: 1,
      color: { dark: '#0b101b', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        if (active) {
          setQrDataUrl(url);
          setQrError(false);
        }
      })
      .catch(() => {
        if (active) setQrError(true);
      });
    return () => {
      active = false;
    };
  }, [activeTab, publicUrl]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(embed);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  function trackDownload() {
    const match = /\/empresa\/([^/?#]+)/.exec(publicUrl);
    if (!match) return;
    void api
      .trackPublicAnalytics({
        slug: decodeURIComponent(match[1]),
        type: 'seal_download',
        path: window.location.pathname,
      })
      .catch(() => undefined);
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="text-base font-bold text-slate-900">Sello verificado</h3>
      <p className="text-xs text-slate-500">Descárgalo o insértalo en tu web</p>

      <div className="mt-4 flex gap-1 rounded-lg bg-slate-100 p-1 text-xs font-medium">
        {[
          { id: 'seal', label: 'Sello' },
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

      {activeTab === 'qr' ? (
        <div className="mt-4">
          <div className="flex items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4">
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrDataUrl}
                alt={`Código QR del perfil de ${publicUrl}`}
                className="h-44 w-44 rounded-md bg-white p-1"
              />
            ) : qrError ? (
              <p className="text-sm text-red-600">No se pudo generar el QR.</p>
            ) : (
              <p className="text-sm text-slate-500">Generando QR…</p>
            )}
          </div>
          <p className="mt-2 text-center text-xs text-slate-500">
            Escanea para dejar una reseña
          </p>
          {qrDataUrl && (
            <a
              href={qrDataUrl}
              download={`fiverten-qr-${publicId ?? 'empresa'}.png`}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#2563eb] px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-600"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              Descargar QR
            </a>
          )}
        </div>
      ) : activeTab === 'seal' ? (
        <div className="mt-4">
          <div className="flex items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4">
            {sealSvgUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={sealSvgUrl} alt="Sello FIVERTEN" className="h-24 w-auto" />
            ) : (
              <p className="text-sm text-slate-500">Publica tu perfil para obtener el sello.</p>
            )}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <a
              href={sealPngUrl || '#'}
              download={`fiverten-sello-${publicId ?? 'empresa'}.png`}
              onClick={trackDownload}
              aria-disabled={!sealPngUrl}
              className={`inline-flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold text-white transition ${
                sealPngUrl ? 'bg-[#2563eb] hover:bg-blue-600' : 'pointer-events-none bg-slate-300'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              PNG
            </a>
            <a
              href={sealSvgUrl || '#'}
              download={`fiverten-sello-${publicId ?? 'empresa'}.svg`}
              onClick={trackDownload}
              aria-disabled={!sealSvgUrl}
              className={`inline-flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold text-white transition ${
                sealSvgUrl ? 'bg-slate-900 hover:bg-slate-700' : 'pointer-events-none bg-slate-300'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              SVG
            </a>
          </div>
        </div>
      ) : (
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
      )}

      <div className="mt-4 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
        <span className="material-symbols-outlined text-[16px] text-slate-400">
          {activeTab === 'qr' ? 'qr_code_2' : 'code'}
        </span>
        <span className="truncate text-xs text-slate-500">{embed}</span>
        <button
          type="button"
          onClick={() => void copy()}
          className="ml-auto shrink-0 rounded-md bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-slate-700"
        >
          {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>
    </div>
  );
}
