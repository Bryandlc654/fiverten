'use client';

import { useRef, useState, type FormEvent } from 'react';
import { ApiError, type CaseFile, type CaseMessage, type CaseSender } from '../../lib/api';
import { Alert, inputClass } from '../ui';
import { formatDate } from './case-labels';

// Deben coincidir con backend/src/reviews/case-files.ts.
const MAX_FILES = 5;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf';

function formatSize(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Guarda el archivo descargado con su nombre original. */
function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

interface CaseThreadProps {
  messages: CaseMessage[];
  /** Quién es "yo" en este hilo: sus mensajes van a la derecha. */
  self: CaseSender;
  names: Record<Exclude<CaseSender, 'system'>, string>;
  download: (fileId: string) => Promise<Blob>;
}

/** Conversación del caso con las evidencias adjuntas de cada mensaje. */
export function CaseThread({ messages, self, names, download }: CaseThreadProps) {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function open(file: CaseFile) {
    setDownloading(file.id);
    setError(null);
    try {
      saveBlob(await download(file.id), file.filename);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo descargar el archivo');
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="space-y-3">
      {error && <Alert tone="error">{error}</Alert>}
      {messages.length === 0 && <p className="text-sm text-slate-500">Aún no hay mensajes.</p>}
      <ol className="space-y-3">
        {messages.map((item) =>
          item.senderType === 'system' ? (
            <li key={item.id} className="text-center text-xs italic text-slate-400">
              {item.body}
            </li>
          ) : (
            <li
              key={item.id}
              className={`rounded-lg bg-white p-3 ${
                item.senderType === self
                  ? 'ml-8 border border-blue-100'
                  : item.senderType === 'admin'
                    ? 'mr-8 border border-violet-100'
                    : 'mr-8 border border-slate-200'
              }`}
            >
              <p className="mb-1 flex justify-between gap-2 text-xs text-slate-500">
                <span className="font-semibold">
                  {item.senderType === self ? 'Tú' : names[item.senderType]}
                </span>
                <span>{formatDate(item.createdAt)}</span>
              </p>
              <p className="whitespace-pre-line text-sm text-slate-800">{item.body}</p>
              {item.files.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-2">
                  {item.files.map((file) => (
                    <li key={file.id}>
                      <button
                        type="button"
                        disabled={downloading === file.id}
                        onClick={() => void open(file)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700 transition hover:border-blue-300 hover:text-[#2563eb] disabled:opacity-60"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {file.mimeType === 'application/pdf' ? 'picture_as_pdf' : 'image'}
                        </span>
                        <span className="max-w-[180px] truncate">{file.filename}</span>
                        <span className="text-slate-400">{formatSize(file.size)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ),
        )}
      </ol>
    </div>
  );
}

interface CaseComposerProps {
  placeholder: string;
  submitLabel: string;
  /** Envía el mensaje; si falla, lanza el error para mostrarlo aquí. */
  onSend: (body: string, files: File[]) => Promise<void>;
}

/** Mensaje con evidencias adjuntas (fotos o PDF). */
export function CaseComposer({ placeholder, submitLabel, onSend }: CaseComposerProps) {
  const [body, setBody] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const next = [...files, ...Array.from(list)];
    if (next.length > MAX_FILES) {
      setError(`Puedes adjuntar como máximo ${MAX_FILES} archivos por mensaje.`);
    } else if (next.some((file) => file.size > MAX_FILE_BYTES)) {
      setError('Cada archivo puede ocupar como máximo 5 MB.');
    } else if (next.some((file) => !ACCEPT.split(',').includes(file.type))) {
      setError('Solo se admiten imágenes JPG, PNG o WEBP y documentos PDF.');
    } else {
      setError(null);
      setFiles(next);
    }
    if (input.current) input.current.value = '';
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSend(body.trim(), files);
      setBody('');
      setFiles([]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo enviar el mensaje');
    } finally {
      setBusy(false);
    }
  }

  const empty = body.trim().length < 2 && files.length === 0;

  return (
    <form onSubmit={submit} className="space-y-2">
      {error && <Alert tone="error">{error}</Alert>}
      <textarea
        rows={3}
        maxLength={3000}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder}
        className={inputClass}
      />
      {files.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700"
            >
              <span className="max-w-[180px] truncate">{file.name}</span>
              <span className="text-slate-400">{formatSize(file.size)}</span>
              <button
                type="button"
                aria-label={`Quitar ${file.name}`}
                onClick={() => setFiles(files.filter((_, i) => i !== index))}
                className="text-slate-400 hover:text-red-600"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50">
          <span className="material-symbols-outlined text-[18px]">attach_file</span>
          Adjuntar evidencias
          <input
            ref={input}
            type="file"
            multiple
            accept={ACCEPT}
            className="sr-only"
            onChange={(e) => addFiles(e.target.files)}
          />
        </label>
        <button
          type="submit"
          disabled={busy || empty}
          className="rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-60"
        >
          {busy ? 'Enviando…' : submitLabel}
        </button>
      </div>
      <p className="text-xs text-slate-400">
        Fotos JPG, PNG o WEBP y PDF. Hasta 5 archivos de 5 MB por mensaje.
      </p>
    </form>
  );
}
