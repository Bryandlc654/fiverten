'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import HomeHeader from '../../components/public/HomeHeader';
import PublicFooter from '../../components/public/PublicFooter';
import { Alert, Field, inputClass } from '../../components/ui';
import {
  ApiError,
  api,
  type AdminPlan,
  type PublicCatalogs,
  type PublicVerificationInfo,
} from '../../lib/api';

const STEPS = [
  {
    title: 'Registra tu empresa',
    text: 'Crea la cuenta, completa el perfil y activa la página pública.',
  },
  {
    title: 'Solicita la verificación',
    text: 'Inicia la solicitud desde el panel y acepta las condiciones.',
  },
  {
    title: 'Acredita la identidad',
    text: 'Aporta identidad del representante y datos fiscales de la empresa.',
  },
  {
    title: 'Documentación y evidencias',
    text: 'Sube documentación vigente y al menos un proyecto con evidencias.',
  },
  {
    title: 'Revisión y activación',
    text: 'FIVERTEN revisa y, solo si aprueba, activa el sello VERIFIED.',
  },
];

const BENEFITS = [
  {
    title: 'Visibilidad',
    text: 'Perfil público en el directorio, con sectores, proyectos y opiniones contextualizadas.',
    icon: 'search',
  },
  {
    title: 'Credibilidad',
    text: 'La verificación la concede FIVERTEN tras revisar identidad y documentación. No es autoverificación.',
    icon: 'shield',
  },
  {
    title: 'Sello dinámico',
    text: 'Sello en PNG/SVG y código embed que refleja el estado real de la verificación.',
    icon: 'seal',
  },
  {
    title: 'Opiniones verificadas',
    text: 'Opiniones vinculadas a clientes y proyectos cuando existe relación comprobable.',
    icon: 'reviews',
  },
];

export default function VerifyCompanyPage() {
  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [info, setInfo] = useState<PublicVerificationInfo | null>(null);
  const [catalogs, setCatalogs] = useState<PublicCatalogs | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [sector, setSector] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [country, setCountry] = useState('');
  const [message, setMessage] = useState('');
  const [consent, setConsent] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    api
      .publicPlans()
      .then((data) => setPlans(data.plans))
      .catch(() => setPlans([]));
    api
      .publicVerificationInfo()
      .then(setInfo)
      .catch(() => setInfo(null));
    api
      .publicCatalogs()
      .then(setCatalogs)
      .catch(() => setCatalogs(null));
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
      const sectorName = catalogs?.sectors.find((item) => item.slug === sector)?.name;
      const countryName = catalogs?.countries.find((item) => item.iso2 === country)?.name;
      await api.submitVerificationInquiry({
        companyName: companyName.trim(),
        taxId: taxId.trim() || undefined,
        sector: sectorName || undefined,
        contactName: contactName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        website: website.trim() || undefined,
        country: countryName || undefined,
        message: message.trim() || undefined,
        consent,
        honeypot: honeypot || undefined,
      });
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo enviar la solicitud');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="home-root min-h-screen bg-paper font-sans text-ink antialiased">
      <HomeHeader />

      <section className="home-noise relative isolate overflow-hidden bg-ink pb-20 pt-36 text-white lg:pb-24 lg:pt-44">
        <div className="home-grid-bg absolute inset-0 -z-10" />
        <div className="home-orb absolute -right-32 top-16 -z-10 h-[430px] w-[430px] rounded-full bg-aqua/15 blur-3xl" />
        <div className="home-orb home-orb-delay absolute -left-40 bottom-0 -z-10 h-[340px] w-[340px] rounded-full bg-blue-500/15 blur-3xl" />
        <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-5 lg:grid-cols-[1.05fr_.95fr] lg:px-8">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-aqua/25 bg-aqua/10 px-4 py-2 text-xs font-semibold tracking-wide text-aqua">
              VERIFICACIÓN DE EMPRESAS
            </div>
            <h1 className="font-display max-w-3xl text-5xl font-bold leading-[1.04] tracking-[-.055em] sm:text-6xl">
              Obtén el sello
              <br />
              <span className="text-aqua">de empresa verificada.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-slate-300 sm:text-lg">
              Un perfil público con identidad, documentación y evidencias revisadas. Sin
              autoverificación y sin promesas que no podamos demostrar.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="#solicitud"
                className="home-shine inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-blue-700"
              >
                Iniciar solicitud <span>→</span>
              </a>
              <Link
                href="/metodologia"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:border-aqua/60 hover:bg-white/5"
              >
                Ver metodología <span className="text-aqua">↗</span>
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-400">
              <span>✓ Revisión humana</span>
              <span>✓ Evidencias comprobables</span>
              <span>✓ Estado transparente</span>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
            <p className="text-xs font-bold uppercase tracking-[.2em] text-aqua">Qué obtienes</p>
            <ul className="mt-5 space-y-4 text-sm text-slate-300">
              {[
                'Perfil público con estado de verificación y sello dinámico.',
                'Documentación y proyectos visibles solo en su alcance público.',
                'Opiniones con contexto y clientes identificados.',
                'Trazabilidad de revisiones, caducidad y renovación.',
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-0.5 text-emerald-400">✓</span>
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-6 rounded-xl border border-amber-300/20 bg-amber-400/10 p-4 text-xs leading-6 text-amber-100">
              Enviar este formulario no activa VERIFIED. El estado se concede solo después de la
              revisión real de FIVERTEN.
            </div>
          </div>
        </div>
      </section>

      <main>
        <section id="proceso" className="bg-white py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div className="max-w-3xl">
              <span className="text-xs font-bold uppercase tracking-[.2em] text-slate-500">
                Proceso
              </span>
              <h2 className="font-display mt-3 text-3xl font-bold tracking-[-.045em] text-slate-900 sm:text-4xl">
                Cinco pasos. Sin atajos.
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-500">
                La empresa aporta información; FIVERTEN revisa y decide. Ninguna empresa puede
                aprobarse a sí misma.
              </p>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-5">
              {STEPS.map((step, index) => (
                <article
                  key={step.title}
                  className="relative rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <span
                    className={`grid h-10 w-10 place-items-center rounded-xl text-sm font-bold ${
                      index === 4 ? 'bg-blue-600 text-white' : 'bg-ink text-aqua'
                    }`}
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <h3 className="mt-4 text-sm font-bold text-slate-900">{step.title}</h3>
                  <p className="mt-1 text-xs leading-6 text-slate-500">{step.text}</p>
                </article>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-3 rounded-2xl bg-ink p-5 text-xs text-slate-300 sm:items-center sm:justify-between">
              <span>
                Documentos: identidad, fiscal y domicilio. Evidencias: {info?.minProjects ?? 1}{' '}
                proyecto mínimo.
              </span>
              <span>
                Revisión: {info?.reviewDays ?? 5} días hábiles · Validez: {info?.expiryDays ?? 365}{' '}
                días
              </span>
            </div>
          </div>
        </section>

        <section className="bg-[#F4F3EF] py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div className="max-w-3xl">
              <span className="text-xs font-bold uppercase tracking-[.2em] text-slate-500">
                Beneficios
              </span>
              <h2 className="font-display mt-3 text-3xl font-bold tracking-[-.045em] text-slate-900 sm:text-4xl">
                Más confianza, con evidencia.
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-500">
                Beneficios verificables del perfil público. No prometemos más ventas ni resultados
                comerciales que dependan de terceros.
              </p>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {BENEFITS.map((benefit) => (
                <article
                  key={benefit.title}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-700">
                    <BenefitIcon name={benefit.icon} />
                  </span>
                  <h3 className="mt-4 text-base font-bold text-slate-900">{benefit.title}</h3>
                  <p className="mt-2 text-xs leading-6 text-slate-500">{benefit.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="max-w-2xl">
                <span className="text-xs font-bold uppercase tracking-[.2em] text-slate-500">
                  Planes
                </span>
                <h2 className="font-display mt-3 text-3xl font-bold tracking-[-.045em] text-slate-900 sm:text-4xl">
                  Elige cómo crecer.
                </h2>
                <p className="mt-4 text-sm leading-7 text-slate-500">
                  La verificación está incluida en todos los planes. Los precios mostrados son de
                  referencia y quedan pendientes de confirmación comercial.
                </p>
              </div>
              <Link href="/precios" className="text-xs font-semibold text-blue-700 hover:underline">
                Comparar en detalle →
              </Link>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {plans.map((plan) => (
                <article
                  key={plan.id}
                  className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <h3 className="text-sm font-bold text-slate-900">{plan.name}</h3>
                  <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                    {plan.priceMonthly > 0 ? `${plan.priceMonthly} €` : 'A medida'}
                    {plan.priceMonthly > 0 && (
                      <span className="text-xs font-medium text-slate-400">/mes</span>
                    )}
                  </p>
                  <p className="mt-2 min-h-[42px] text-xs leading-6 text-slate-500">
                    {plan.description}
                  </p>
                  <p className="mt-3 text-xs text-slate-600">
                    {plan.reviewLimit ? `${plan.reviewLimit} reseñas` : 'Reseñas ilimitadas'} ·{' '}
                    {plan.userLimit ? `${plan.userLimit} usuarios` : 'Usuarios ilimitados'}
                  </p>
                  <Link
                    href="/register"
                    className="mt-5 inline-flex justify-center rounded-lg bg-ink px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                  >
                    Empezar
                  </Link>
                </article>
              ))}
            </div>
            <p className="mt-4 text-[11px] text-slate-400">
              Precios de referencia. La disponibilidad y condiciones finales se confirmarán con el
              equipo comercial.
            </p>
          </div>
        </section>

        <section id="solicitud" className="relative overflow-hidden bg-[#F4F3EF] py-20 lg:py-24">
          <div className="mx-auto grid max-w-7xl gap-8 px-5 lg:grid-cols-[.85fr_1.15fr] lg:px-8">
            <div>
              <span className="text-xs font-bold uppercase tracking-[.2em] text-slate-500">
                Solicitud
              </span>
              <h2 className="font-display mt-3 text-3xl font-bold tracking-[-.045em] text-slate-900 sm:text-4xl">
                Cuéntanos quién eres.
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-500">
                Primera captura de datos. No necesitas toda la documentación todavía: el equipo
                revisará el caso y te indicará los siguientes pasos.
              </p>
              <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 text-xs leading-6 text-slate-600">
                <p>
                  <strong className="text-slate-900">Qué pasa después:</strong>
                </p>
                <ol className="mt-2 list-decimal space-y-1 pl-4">
                  <li>Registramos tu solicitud y enviamos confirmación.</li>
                  <li>El equipo contacta para validar identidad y documentación.</li>
                  <li>La empresa completa el proceso desde su panel.</li>
                  <li>FIVERTEN decide; el sello solo se activa si se aprueba.</li>
                </ol>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              {sent ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-2xl text-emerald-700">
                    ✓
                  </span>
                  <h3 className="mt-4 text-xl font-bold text-slate-900">Solicitud recibida</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    Hemos registrado la solicitud y enviado una confirmación a{' '}
                    <strong>{email}</strong>. El equipo de FIVERTEN se pondrá en contacto contigo.
                  </p>
                  <p className="mt-3 rounded-lg bg-white/70 p-3 text-xs leading-6 text-emerald-800">
                    Importante: esta solicitud no activa el estado VERIFIED. La verificación solo se
                    concede después de la revisión documental y de evidencias.
                  </p>
                  <Link
                    href="/register"
                    className="mt-5 inline-flex rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white"
                  >
                    Crear cuenta de empresa
                  </Link>
                </div>
              ) : (
                <form onSubmit={submit} className="space-y-4">
                  <div className="hidden" aria-hidden="true">
                    <label htmlFor="companyFax">Fax</label>
                    <input
                      id="companyFax"
                      name="companyFax"
                      tabIndex={-1}
                      autoComplete="off"
                      value={honeypot}
                      onChange={(event) => setHoneypot(event.target.value)}
                    />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Formulario de solicitud</h3>
                  {error && <Alert tone="error">{error}</Alert>}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field label="Nombre de la empresa *" className="block">
                      <input
                        required
                        value={companyName}
                        onChange={(event) => setCompanyName(event.target.value)}
                        className={inputClass}
                      />
                    </Field>
                    <Field label="NIF / CIF (opcional)" className="block">
                      <input
                        value={taxId}
                        onChange={(event) => setTaxId(event.target.value)}
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Sector" className="block">
                      <select
                        value={sector}
                        onChange={(event) => setSector(event.target.value)}
                        className={inputClass}
                      >
                        <option value="">Selecciona un sector</option>
                        {catalogs?.sectors.map((item) => (
                          <option key={item.id} value={item.slug}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="País" className="block">
                      <select
                        value={country}
                        onChange={(event) => setCountry(event.target.value)}
                        className={inputClass}
                      >
                        <option value="">Selecciona un país</option>
                        {catalogs?.countries.map((item) => (
                          <option key={item.id} value={item.iso2}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Persona de contacto *" className="block">
                      <input
                        required
                        value={contactName}
                        onChange={(event) => setContactName(event.target.value)}
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Correo *" className="block">
                      <input
                        required
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Teléfono (opcional)" className="block">
                      <input
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Sitio web (opcional)" className="block">
                      <input
                        type="url"
                        value={website}
                        onChange={(event) => setWebsite(event.target.value)}
                        placeholder="https://"
                        className={inputClass}
                      />
                    </Field>
                  </div>
                  <Field label="Mensaje (opcional)" className="block">
                    <textarea
                      rows={3}
                      value={message}
                      onChange={(event) => setMessage(event.target.value)}
                      className={inputClass}
                    />
                  </Field>
                  <label className="flex items-start gap-3 text-xs leading-6 text-slate-600">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(event) => setConsent(event.target.checked)}
                      className="mt-1"
                    />
                    <span>
                      Acepto la política de privacidad y el tratamiento de mis datos para gestionar
                      la solicitud. Entiendo que enviar el formulario no implica obtener el estado
                      VERIFIED.
                    </span>
                  </label>
                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full rounded-xl bg-ink px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-60"
                  >
                    {busy ? 'Enviando…' : 'Enviar solicitud'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}

function BenefitIcon({ name }: { name: string }) {
  if (name === 'search') {
    return (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <circle cx="11" cy="11" r="7" />
        <path d="m16 16 4 4" strokeLinecap="round" strokeWidth="2" />
      </svg>
    );
  }
  if (name === 'shield') {
    return (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          d="M12 3 20 6v5c0 5-3.4 8.3-8 10-4.6-1.7-8-5-8-10V6l8-3Z"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
        <path
          d="m8.5 12 2.2 2.2 4.8-4.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    );
  }
  if (name === 'seal') {
    return (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          d="M12 2 14.5 4.5l3.5-.2 1.2 3.3 3 1.9-1.1 3.3 1.1 3.3-3 1.9-1.2 3.3-3.5-.2L12 23l-2.5-2.5-3.5.2-1.2-3.3-3-1.9 1.1-3.3-1.1-3.3 3-1.9L6 3.7l3.5.2L12 2Z"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    );
  }
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        d="M4 5h16v12H7l-3 3V5Z"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path d="m8 10 2.5 2.5L16 8" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}
