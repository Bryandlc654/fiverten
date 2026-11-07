'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { api } from '../../lib/api';

type SealTab = 'seal' | 'widget' | 'qr';

const OFFICIAL_PNG = '/sello-fiverten-verificado.png';
const OFFICIAL_SVG = '/sello-fiverten-verificado.svg';

export default function SealCard({
  publicUrl,
  publicId,
  embedToken,
  verified,
}: {
  publicUrl: string;
  publicId: string | undefined;
  embedToken?: string | null;
  verified: boolean;
}) {
  const [activeTab, setActiveTab] = useState<SealTab>('seal');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrError, setQrError] = useState(false);
  const [copied, setCopied] = useState(false);

  const origin = typeof window === 'undefined' ? 'https://fiverten.com' : window.location.origin;
  const sealId = embedToken ?? publicId;
  const widgetUrl = sealId ? `${origin}/api/widget/${sealId}.js` : '';
  const officialEmbed = `<a href="${publicUrl}" target="_blank" rel="noopener"><img src="${origin}${OFFICIAL_SVG}" alt="Sello FIVERTEN" width="160" height="160"></a>`;
  const widgetEmbed = `<script src="${widgetUrl}" async></script>`;
  const embed =
    activeTab === 'seal' ? officialEmbed : activeTab === 'widget' ? widgetEmbed : publicUrl;

  useEffect(() => {
    if (activeTab !== 'qr') return;
    let active = true;
    QRCode.toDataURL(publicUrl, {
      width: 512,
      margin: 1,
      color: { dark: '#10161C', light: '#ffffff' },
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
      <div className="flex items-start gap-3">
        <Image
          src="/sello-fiverten-verificado.png"
          alt=""
          width={512}
          height={512}
          className="h-10 w-10 shrink-0"
        />
        <div>
          <h3 className="text-base font-bold text-slate-900">Sello verificado</h3>
          <p className="text-xs text-slate-500">Descárgalo o insértalo en tu web</p>
        </div>
      </div>

      <div className="mt-4 flex gap-1 rounded-lg bg-slate-100 p-1 text-xs font-medium">
        {[
          { id: 'seal', label: 'Sello web' },
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
          <p className="mt-2 text-center text-xs text-slate-500">Escanea para dejar una reseña</p>
          {qrDataUrl && (
            <a
              href={qrDataUrl}
              download={`fiverten-qr-${publicId ?? 'empresa'}.png`}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-600"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              Descargar QR
            </a>
          )}
        </div>
      ) : activeTab === 'seal' ? (
        <div className="mt-4">
          <div className="flex items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4">
            <Image
              src={OFFICIAL_PNG}
              alt="Sello FIVERTEN de empresa verificada"
              width={512}
              height={512}
              className="h-24 w-24"
            />
          </div>
          {verified ? (
            <>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <a
                  href={OFFICIAL_PNG}
                  download="sello-fiverten-verificado.png"
                  onClick={trackDownload}
                  className="inline-flex items-center justify-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-600"
                >
                  <span className="material-symbols-outlined text-[16px]">download</span>
                  Descargar PNG
                </a>
                <a
                  href={OFFICIAL_SVG}
                  download="sello-fiverten-verificado.svg"
                  onClick={trackDownload}
                  className="inline-flex items-center justify-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-700"
                >
                  <span className="material-symbols-outlined text-[16px]">download</span>
                  Descargar SVG
                </a>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                Sello oficial de FIVERTEN. Úsalo solo mientras tu empresa mantenga la verificación
                activa.
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                El sello que se actualiza solo está en{' '}
                <Link
                  href="/app/sello"
                  className="font-semibold text-blue-700 underline-offset-2 hover:underline"
                >
                  Sello y embeds
                </Link>
                .
              </p>
            </>
          ) : (
            <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-[11px] leading-relaxed text-slate-600">
              La descarga del sello se habilita cuando FIVERTEN aprueba la verificación de tu
              empresa.
            </p>
          )}
        </div>
      ) : (
        <div className="mt-4 flex items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 py-6">
          <div className="flex items-center gap-2 rounded-lg bg-[#10161C] px-3 py-2 text-white">
            <span className="material-symbols-outlined text-[20px] text-emerald-400">verified</span>
            <div className="leading-none">
              <p className="text-[11px] font-bold">FIVERTEN</p>
              <p className="text-[9px] text-slate-400">Empresa verificada</p>
            </div>
          </div>
        </div>
      )}

      {!(activeTab === 'seal' && !verified) && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <span className="material-symbols-outlined text-[16px] text-slate-400">
            {activeTab === 'qr' ? 'qr_code_2' : 'code'}
          </span>
          <span className="min-w-0 truncate text-xs text-slate-500">{embed}</span>
          <button
            type="button"
            onClick={() => void copy()}
            className="ml-auto shrink-0 rounded-md bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-slate-700"
          >
            {copied ? 'Copiado' : 'Copiar'}
          </button>
        </div>
      )}
    </div>
  );
}
