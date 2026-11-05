import type { Metadata } from 'next';
import Link from 'next/link';
import HomeHeader from '../../components/public/HomeHeader';
import PublicFooter from '../../components/public/PublicFooter';
import VerificationFacts from '../../components/public/VerificationFacts';

export const metadata: Metadata = {
  title: 'Cómo funciona la verificación | FIVERTEN',
  description:
    'Proceso completo de verificación de empresas: documentación, evidencias, revisión humana, sello dinámico y renovación.',
};

const STEPS = [
  {
    number: '01',
    title: 'Registro de la empresa',
    text: 'La empresa crea su cuenta, completa el perfil y activa su página pública.',
    icon: 'store',
  },
  {
    number: '02',
    title: 'Solicitud de verificación',
    text: 'Desde el panel se inicia la solicitud y se aceptan las condiciones del proceso.',
    icon: 'request',
  },
  {
    number: '03',
    title: 'Documentación',
    text: 'Se suben documentos de identidad, fiscales y de domicilio. Son privados: solo los revisa FIVERTEN.',
    icon: 'document',
  },
  {
    number: '04',
    title: 'Proyectos y evidencias',
    text: 'La empresa registra proyectos y adjunta imágenes o PDF que demuestren su actividad.',
    icon: 'folder',
  },
  {
    number: '05',
    title: 'Revisión y activación',
    text: 'FIVERTEN revisa, aprueba o rechaza con motivo. Si se aprueba, se activa el sello dinámico.',
    icon: 'seal',
  },
];

const SEAL_ITEMS = [
  {
    title: 'PNG y SVG',
    text: 'Descarga el sello en los formatos que necesites para tu web o materiales.',
    icon: 'download',
  },
  {
    title: 'Código embed',
    text: 'Inserta el sello con un enlace al perfil público y su estado real.',
    icon: 'code',
  },
  {
    title: 'Estado en el panel',
    text: 'Consulta la vigencia, la fecha de revisión y el historial de verificación.',
    icon: 'panel',
  },
  {
    title: 'Actualización automática',
    text: 'Si caduca o se revoca, el sello deja de mostrarse como verificado.',
    icon: 'refresh',
  },
];

export default function HowItWorksPage() {
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
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-600 opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-600" />
              </span>
              PROCESO DE VERIFICACIÓN
            </div>
            <h1 className="font-display max-w-3xl text-5xl font-bold leading-[1.04] tracking-[-.055em] sm:text-6xl">
              Cómo funciona
              <br />
              <span className="text-aqua">FIVERTEN.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-slate-300 sm:text-lg">
              La verificación es humana y documental. Ninguna empresa puede autoverificarse: el
              equipo de FIVERTEN revisa la información y decide. El sello refleja siempre el estado
              real.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/verificar-empresa"
                className="home-shine inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-blue-700"
              >
                Solicitar verificación <span>→</span>
              </Link>
              <Link
                href="/trust-center"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:border-aqua/60 hover:bg-white/5"
              >
                Ir al Trust Center <span className="text-aqua">↗</span>
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-400">
              <span>✓ 5 pasos claros</span>
              <span>✓ Revisión humana</span>
              <span>✓ Estado trazable</span>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 rounded-[2.5rem] bg-aqua/10 blur-3xl" />
            <div className="relative rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-md sm:p-8">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <span className="text-xs font-bold uppercase tracking-[.18em] text-slate-400">
                  Resumen del proceso
                </span>
                <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-[10px] font-bold text-emerald-300">
                  SIN ATAJOS
                </span>
              </div>
              <div className="mt-5 space-y-4">
                {[
                  ['01', 'La empresa aporta información y evidencias.'],
                  ['02', 'FIVERTEN revisa identidad y documentación.'],
                  ['03', 'Se comprueba al menos un proyecto o evidencia.'],
                  ['04', 'La decisión queda registrada con motivo.'],
                  ['05', 'Solo si se aprueba se activa el estado VERIFIED.'],
                ].map(([number, text]) => (
                  <div key={number} className="flex items-start gap-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-ink text-[11px] font-bold text-aqua">
                      {number}
                    </span>
                    <p className="text-xs leading-6 text-slate-300">{text}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 rounded-xl border border-amber-300/20 bg-amber-400/10 p-4 text-xs leading-6 text-amber-100">
                Enviar una solicitud no activa el sello. La verificación se concede solo después de
                la revisión real.
              </div>
            </div>
          </div>
        </div>
      </section>

      <main>
        <section className="bg-white py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div className="max-w-3xl">
              <span className="text-xs font-bold uppercase tracking-[.2em] text-slate-500">
                Paso a paso
              </span>
              <h2 className="font-display mt-3 text-3xl font-bold tracking-[-.045em] text-slate-900 sm:text-4xl">
                De la solicitud al sello.
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-500">
                Cada paso deja información útil para la revisión y para que el cliente entienda qué
                se ha comprobado.
              </p>
            </div>

            <div className="mt-12 grid gap-4 md:grid-cols-5">
              {STEPS.map((step, index) => (
                <article
                  key={step.number}
                  className="group relative rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:-translate-y-1 hover:border-aqua/60 hover:bg-white hover:shadow-lg"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`grid h-11 w-11 place-items-center rounded-xl text-sm font-bold ${
                        index === 4 ? 'bg-blue-600 text-white shadow-glow' : 'bg-ink text-aqua'
                      }`}
                    >
                      {step.number}
                    </span>
                    <span className="text-slate-400">
                      <StepIcon name={step.icon} />
                    </span>
                  </div>
                  <h3 className="mt-5 text-sm font-bold leading-5 text-slate-900">{step.title}</h3>
                  <p className="mt-2 text-xs leading-6 text-slate-500">{step.text}</p>
                </article>
              ))}
            </div>

            <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.18em] text-slate-500">
                  Qué se revisa
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Identidad, documentación fiscal y domicilio, más al menos un proyecto con
                  evidencias.
                </p>
              </div>
              <Link
                href="/metodologia"
                className="mt-3 inline-flex text-xs font-semibold text-blue-700 hover:underline sm:mt-0"
              >
                Ver criterios completos →
              </Link>
            </div>
          </div>
        </section>

        <section className="bg-[#F4F3EF] py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[.85fr_1.15fr] lg:items-center">
              <div>
                <span className="text-xs font-bold uppercase tracking-[.2em] text-slate-500">
                  Tiempos y validez
                </span>
                <h2 className="font-display mt-3 text-3xl font-bold tracking-[-.045em] text-slate-900 sm:text-4xl">
                  La confianza tiene fecha.
                </h2>
                <p className="mt-4 text-sm leading-7 text-slate-500">
                  Los plazos y la validez se muestran de forma pública. Si la verificación caduca o
                  se revoca, el sello cambia automáticamente.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href="/trust-center#estados"
                    className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400"
                  >
                    Ver estados
                  </Link>
                  <Link
                    href="/verificar-empresa"
                    className="rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                  >
                    Empezar verificación
                  </Link>
                </div>
              </div>
              <VerificationFacts />
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-ink py-20 text-white lg:py-24">
          <div className="absolute -left-20 top-0 h-80 w-80 rounded-full bg-aqua/15 blur-3xl" />
          <div className="absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-blue-500/15 blur-3xl" />
          <div className="relative mx-auto max-w-7xl px-5 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
              <div>
                <span className="text-xs font-bold uppercase tracking-[.2em] text-aqua">
                  Al obtener el sello
                </span>
                <h2 className="font-display mt-3 text-3xl font-bold tracking-[-.045em] sm:text-4xl">
                  Tu reputación,
                  <br />
                  <span className="text-aqua">siempre al día.</span>
                </h2>
                <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300">
                  El sello no es una imagen estática: está conectado al estado de verificación y
                  permite que cualquier visitante compruebe si sigue vigente.
                </p>
                <Link
                  href="/verificar-empresa"
                  className="mt-7 inline-flex rounded-full bg-blue-600 px-6 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-blue-700"
                >
                  Solicitar verificación
                </Link>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {SEAL_ITEMS.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm"
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 text-aqua">
                      <SealIcon name={item.icon} />
                    </span>
                    <h3 className="mt-4 text-sm font-bold text-white">{item.title}</h3>
                    <p className="mt-1 text-xs leading-6 text-slate-400">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-12 grid gap-4 border-t border-white/10 pt-8 sm:grid-cols-3">
              <div className="flex items-start gap-3">
                <span className="text-aqua">✓</span>
                <div>
                  <p className="text-sm font-bold">No hay autoverificación</p>
                  <p className="text-xs text-slate-400">La decisión siempre la toma FIVERTEN.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-aqua">✓</span>
                <div>
                  <p className="text-sm font-bold">Decisiones motivadas</p>
                  <p className="text-xs text-slate-400">Cada cambio de estado queda registrado.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-aqua">✓</span>
                <div>
                  <p className="text-sm font-bold">Sin promesas no demostrables</p>
                  <p className="text-xs text-slate-400">
                    El sello acredita el alcance publicado, no resultados comerciales.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white py-20 lg:py-24">
          <div className="mx-auto max-w-4xl px-5 text-center">
            <span className="text-xs font-bold uppercase tracking-[.2em] text-slate-500">
              Siguiente paso
            </span>
            <h2 className="font-display mt-3 text-3xl font-bold tracking-[-.045em] text-slate-900 sm:text-4xl">
              ¿Quieres verificar tu empresa?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-500">
              Empieza por el formulario de captación. El equipo revisará el caso y te indicará qué
              documentación y evidencias necesitas.
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/verificar-empresa"
                className="rounded-full bg-ink px-6 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-slate-800"
              >
                Solicitar verificación
              </Link>
              <Link
                href="/trust-center"
                className="rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
              >
                Leer Trust Center
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}

function StepIcon({ name }: { name: string }) {
  if (name === 'store') {
    return (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          d="M4 9h16l-1-5H5L4 9Zm0 0v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9M9 21v-6h6v6"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.7"
        />
      </svg>
    );
  }
  if (name === 'request') {
    return (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          d="M9 12h6m-6 4h4m4 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l5 5v11a2 2 0 0 1-2 2Z"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.7"
        />
      </svg>
    );
  }
  if (name === 'document') {
    return (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2Z"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.7"
        />
      </svg>
    );
  }
  if (name === 'folder') {
    return (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          d="M19 11H5m14 0a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2m14 0V9a2 2 0 0 0-2-2M5 11V9a2 2 0 0 1 2-2m0 0V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2M7 7h10"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.7"
        />
      </svg>
    );
  }
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        d="M12 2 14.5 4.5l3.5-.2 1.2 3.3 3 1.9-1.1 3.3 1.1 3.3-3 1.9-1.2 3.3-3.5-.2L12 23l-2.5-2.5-3.5.2-1.2-3.3-3-1.9 1.1-3.3-1.1-3.3 3-1.9L6 3.7l3.5.2L12 2Z"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function SealIcon({ name }: { name: string }) {
  if (name === 'download') {
    return (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    );
  }
  if (name === 'code') {
    return (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          d="m8 8-4 4 4 4m8-8 4 4-4 4M14 4l-4 16"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    );
  }
  if (name === 'panel') {
    return (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path
          d="M9 3v18M13 8h4M13 12h4M13 16h2"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.7"
        />
      </svg>
    );
  }
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        d="M20 11a8.1 8.1 0 0 0-15.5-2M4 4v5h5M4 13a8.1 8.1 0 0 0 15.5 2M20 20v-5h-5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}
