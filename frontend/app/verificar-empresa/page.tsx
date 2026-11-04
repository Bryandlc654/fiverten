'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import PublicShell from '../../components/public/PublicShell';
import { Alert, Field, inputClass } from '../../components/ui';
import {
  ApiError,
  api,
  type AdminPlan,
  type PublicVerificationInfo,
} from '../../lib/api';

const STEPS = [
  'Registra tu empresa en FIVERTEN.',
  'Solicita la verificación y sube la documentación.',
  'Registra al menos un proyecto o evidencia.',
  'FIVERTEN revisa y decide en unos días hábiles.',
  'Si se aprueba, activas el sello y su embed.',
];

export default function VerifyCompanyPage() {
  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [info, setInfo] = useState<PublicVerificationInfo | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    api.publicPlans().then((data) => setPlans(data.plans)).catch(() => setPlans([]));
    api
      .publicVerificationInfo()
      .then(setInfo)
      .catch(() => setInfo(null));
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!consent) {
      setError('Debes aceptar la política de privacidad');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.submitVerificationInquiry({
        companyName,
        contactName,
        email,
        phone: phone.trim() || undefined,
        message: message.trim() || undefined,
        consent,
      });
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo enviar la solicitud');
    } finally {
      setBusy(false);
    }
  }

  return (
    <PublicShell>
      <div className="space-y-10">
        <header className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">
            Verificación de empresas
          </p>
          <h1 className="mt-2 text-3xl font-extrabold text-slate-900">
            Obtén el sello de empresa verificada
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            La verificación combina revisión documental y evidencias de actividad. La empresa no
            puede autoverificarse: FIVERTEN revisa y aprueba.
          </p>
        </header>

        <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-bold text-slate-900">Proceso</h2>
            <ol className="mt-4 space-y-3">
              {STEPS.map((step, index) => (
                <li key={step} className="flex gap-3 text-sm text-slate-700">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0b101b] text-[11px] font-bold text-white">
                    {index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
            <div className="mt-5 rounded-xl bg-slate-50 p-4 text-xs text-slate-600">
              <p>
                <strong>Documentos:</strong>{' '}
                {info
                  ? info.requiredDocuments
                      .map((document) =>
                        ({
                          identity: 'identidad',
                          tax: 'fiscal',
                          address: 'domicilio',
                          other: 'otros',
                        })[document] ?? document,
                      )
                      .join(', ')
                  : 'identidad, fiscal y domicilio'}
                .
              </p>
              <p className="mt-1">
                <strong>Evidencias:</strong> al menos {info?.minProjects ?? 1} proyecto con
                archivos o URL.
              </p>
              <p className="mt-1">
                <strong>Revisión:</strong> {info?.reviewDays ?? 5} días hábiles.{' '}
                <strong>Validez:</strong> {info?.expiryDays ?? 365} días.
              </p>
              <p className="mt-1"><strong>Coste:</strong> incluido en todos los planes.</p>
            </div>
            <Link href="/metodologia" className="mt-4 inline-flex text-xs font-semibold text-blue-600 hover:underline">
              Ver criterios completos
            </Link>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-bold text-slate-900">Formulario de solicitud</h2>
            {sent ? (
              <div className="mt-4">
                <Alert tone="success">
                  Hemos recibido tu solicitud. El equipo de FIVERTEN se pondrá en contacto contigo.
                </Alert>
                <Link
                  href="/register"
                  className="mt-4 inline-flex rounded-lg bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white"
                >
                  Crear cuenta de empresa
                </Link>
              </div>
            ) : (
              <form onSubmit={submit} className="mt-4 space-y-3">
                {error && <Alert tone="error">{error}</Alert>}
                <Field label="Empresa" className="block">
                  <input required value={companyName} onChange={(e) => setCompanyName(e.target.value)} className={inputClass} />
                </Field>
                <Field label="Persona de contacto" className="block">
                  <input required value={contactName} onChange={(e) => setContactName(e.target.value)} className={inputClass} />
                </Field>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Correo" className="block">
                    <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
                  </Field>
                  <Field label="Teléfono (opcional)" className="block">
                    <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
                  </Field>
                </div>
                <Field label="Mensaje (opcional)" className="block">
                  <textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} className={inputClass} />
                </Field>
                <label className="flex items-start gap-2 text-xs text-slate-600">
                  <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
                  Acepto la política de privacidad y el tratamiento de mis datos para gestionar la solicitud.
                </label>
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full rounded-lg bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {busy ? 'Enviando…' : 'Enviar solicitud'}
                </button>
              </form>
            )}
          </div>
        </section>

        <section>
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">Planes</h2>
              <p className="mt-1 text-sm text-slate-600">
                La verificación está incluida en todos los planes. El plan define usuarios y reseñas.
              </p>
            </div>
            <Link href="/precios" className="text-xs font-semibold text-blue-600 hover:underline">
              Comparar en detalle
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {plans.map((plan) => (
              <article key={plan.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <h3 className="text-sm font-bold text-slate-900">{plan.name}</h3>
                <p className="mt-1 text-2xl font-extrabold text-slate-900">
                  {plan.priceMonthly > 0 ? `${plan.priceMonthly} €` : 'Personalizado'}
                  {plan.priceMonthly > 0 && <span className="text-xs font-medium text-slate-500">/mes</span>}
                </p>
                <p className="mt-1 min-h-[36px] text-xs text-slate-500">{plan.description}</p>
                <p className="mt-2 text-xs text-slate-600">
                  {plan.reviewLimit ? `${plan.reviewLimit} reseñas` : 'Reseñas ilimitadas'} ·{' '}
                  {plan.userLimit ? `${plan.userLimit} usuarios` : 'Usuarios ilimitados'}
                </p>
                <Link
                  href="/register"
                  className="mt-3 inline-flex w-full justify-center rounded-lg bg-[#2563eb] px-3 py-2 text-xs font-semibold text-white hover:bg-blue-600"
                >
                  Empezar
                </Link>
              </article>
            ))}
          </div>
        </section>
      </div>
    </PublicShell>
  );
}
