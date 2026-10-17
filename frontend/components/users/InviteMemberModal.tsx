'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { ApiError, api } from '../../lib/api';
import { ROLE_OPTIONS } from '../../lib/roles';
import { Alert, Field, inputClass } from '../ui';

interface InviteForm {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

const EMPTY_FORM: InviteForm = { email: '', firstName: '', lastName: '', role: 'viewer' };

interface InviteMemberModalProps {
  onClose: () => void;
  onInvited: (email: string) => void;
}

/**
 * Envía una invitación por correo. No crea la cuenta ni añade a nadie: el
 * invitado acepta desde el enlace y, si es nuevo, elige su propia contraseña.
 */
export default function InviteMemberModal({ onClose, onInvited }: InviteMemberModalProps) {
  const [form, setForm] = useState<InviteForm>(EMPTY_FORM);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close() {
    if (!sending) onClose();
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && !sending) onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, sending]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSending(true);
    setError(null);
    try {
      const invitation = await api.inviteMember({
        email: form.email.trim(),
        firstName: form.firstName.trim() || undefined,
        lastName: form.lastName.trim() || undefined,
        role: form.role,
      });
      onInvited(invitation.email);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo enviar la invitación');
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm sm:items-center">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={close}
        className="absolute inset-0 cursor-default"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-user-title"
        className="relative z-10 w-full max-w-lg rounded-xl border border-slate-200 bg-white p-5 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="invite-user-title" className="text-base font-bold text-slate-900">
              Invitar usuario
            </h2>
            <p className="text-xs text-slate-500">
              Le enviaremos un enlace por correo. Entrará en la empresa cuando lo acepte.
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            disabled={sending}
            aria-label="Cerrar"
            className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-60"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {error && (
          <Alert tone="error" className="mt-4">
            {error}
          </Alert>
        )}

        <form onSubmit={onSubmit} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Correo electrónico" className="sm:col-span-2">
            <input
              type="email"
              required
              placeholder="correo@empresa.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label="Nombre">
            <input
              placeholder="Nombre"
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label="Apellidos">
            <input
              placeholder="Apellidos"
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label="Rol" className="sm:col-span-2">
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className={inputClass}
            >
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <div className="mt-1 flex justify-end gap-2 sm:col-span-2">
            <button
              type="button"
              onClick={close}
              disabled={sending}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={sending}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
              {sending ? 'Enviando…' : 'Enviar invitación'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
