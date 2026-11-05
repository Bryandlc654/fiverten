import type { Metadata } from 'next';
import Link from 'next/link';
import HomeHeader from '../../components/public/HomeHeader';
import PublicFooter from '../../components/public/PublicFooter';
import VerificationFacts from '../../components/public/VerificationFacts';

export const metadata: Metadata = {
  title: 'Metodología de verificación | FIVERTEN',
  description:
    'Criterios de aprobación, motivos de rechazo, validez, renovación y política de opiniones de FIVERTEN.',
};

const CHECKS = [
  {
    title: 'Identidad',
    text: 'Representante legal o apoderado, razón social, CIF/NIF y domicilio fiscal.',
    icon: 'identity',
  },
  {
    title: 'Documentación',
    text: 'Documentos fiscales, de domicilio, licencias, seguros o certificados cuando aplican.',
    icon: 'document',
  },
  {
    title: 'Actividad',
    text: 'Al menos un proyecto o evidencia verificable que demuestre actividad real.',
    icon: 'activity',
  },
  {
    title: 'Coherencia',
    text: 'Datos coincidentes entre perfil, documentación, web y actividad declarada.',
    icon: 'check',
  },
];

const APPROVAL = [
  'Documentos legibles y vigentes.',
  'Datos fiscales coincidentes con el perfil.',
  'Evidencias coherentes con la actividad declarada.',
  'Sin señales de suplantación o documentación manipulada.',
  'Relación empresa-proyecto-cliente comprobable cuando se publica un proyecto.',
];

const REJECTION = [
  'Documentación incompleta, ilegible o caducada.',
  'Datos que no coinciden con la empresa.',
  'Evidencias no verificables o insuficientes.',
  'Sospecha fundada de fraude o suplantación.',
  'Opiniones incentivadas o relaciones no declaradas.',
];

const OPINION_RULES = [
  {
    title: 'Identificación',
    text: 'El cliente debe tener un canal de contacto o identidad confirmada. Nunca publicamos su email.',
  },
  {
    title: 'Relación comprobable',
    text: 'La experiencia puede vincularse a proyecto, contrato, factura o solicitud personalizada.',
  },
  {
    title: 'Sin incentivos',
    text: 'No se permiten regalos, descuentos ni contraprestaciones a cambio de una opinión.',
  },
  {
    title: 'Moderación trazable',
    text: 'La empresa puede reportar y responder, pero no ocultar. Cada decisión queda registrada.',
  },
];

const LIMITS = [
  {
    title: 'No es una auditoría financiera',
    text: 'La verificación no evalúa solvencia, cuentas anuales ni capacidad de pago.',
  },
  {
    title: 'No garantiza comportamiento futuro',
    text: 'Acredita el alcance y la fecha revisados, no resultados comerciales futuros.',
  },
  {
    title: 'No sustituye obligaciones legales',
    text: 'Validar documentación no exime a la empresa de cumplir la normativa aplicable.',
  },
];

export default function MethodologyPage() {
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
              METODOLOGÍA PÚBLICA
            </div>
            <h1 className="font-display max-w-3xl text-5xl font-extrabold leading-[1.04] tracking-[-.055em] sm:text-6xl">
              Criterios y políticas
              <br />
              <span className="bg-gradient-to-r from-aqua via-mint to-white bg-clip-text text-transparent">
                de verificación.
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-slate-300 sm:text-lg">
              Estas reglas definen cómo FIVERTEN revisa y mantiene la verificación de empresas. Son
              públicas para que cualquier persona pueda entender el proceso, sus límites y sus
              decisiones.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/verificar-empresa"
                className="home-shine inline-flex items-center justify-center gap-2 rounded-full bg-aqua px-6 py-3 text-sm font-bold text-ink transition hover:-translate-y-0.5 hover:bg-mint"
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
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
            <p className="text-xs font-bold uppercase tracking-[.2em] text-aqua">
              Principios de revisión
            </p>
            <ul className="mt-5 space-y-4 text-sm text-slate-300">
              {[
                'Revisión humana, no automática.',
                'Decisiones con motivo y trazabilidad.',
                'Sin autoverificación de la empresa.',
                'Estados públicos que reflejan la vigencia real.',
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-0.5 text-emerald-400">✓</span>
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-6 rounded-xl border border-amber-300/20 bg-amber-400/10 p-4 text-xs leading-6 text-amber-100">
              Aprobar una verificación no equivale a garantizar solvencia, calidad futura ni
              cumplimiento total.
            </div>
          </div>
        </div>
      </section>

      <main>
        <section className="bg-white py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div className="max-w-3xl">
              <span className="text-xs font-bold uppercase tracking-[.2em] text-teal-700">
                Qué verificamos
              </span>
              <h2 className="font-display mt-3 text-3xl font-extrabold tracking-[-.045em] text-slate-900 sm:text-4xl">
                Cuatro dimensiones, una decisión.
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-500">
                No basta con un documento aislado: revisamos identidad, documentación, actividad y
                coherencia entre todo lo aportado.
              </p>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {CHECKS.map((item) => (
                <article
                  key={item.title}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:-translate-y-1 hover:border-aqua/60 hover:bg-white hover:shadow-lg"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-ink text-aqua">
                    <CheckIcon name={item.icon} />
                  </span>
                  <h3 className="mt-4 text-base font-bold text-slate-900">{item.title}</h3>
                  <p className="mt-2 text-xs leading-6 text-slate-500">{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#f4f7fa] py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div className="grid gap-6 lg:grid-cols-2">
              <article className="rounded-3xl border border-emerald-200 bg-white p-7 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
                    ✓
                  </span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[.18em] text-emerald-700">
                      Decisión favorable
                    </p>
                    <h2 className="font-display text-2xl font-extrabold text-slate-900">
                      Criterios de aprobación
                    </h2>
                  </div>
                </div>
                <ul className="mt-6 space-y-3 text-sm leading-6 text-slate-600">
                  {APPROVAL.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span className="mt-0.5 font-bold text-emerald-600">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </article>

              <article className="rounded-3xl border border-rose-200 bg-white p-7 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-rose-100 text-rose-700">
                    !
                  </span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[.18em] text-rose-700">
                      Decisión desfavorable
                    </p>
                    <h2 className="font-display text-2xl font-extrabold text-slate-900">
                      Motivos de rechazo
                    </h2>
                  </div>
                </div>
                <ul className="mt-6 space-y-3 text-sm leading-6 text-slate-600">
                  {REJECTION.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span className="mt-0.5 font-bold text-rose-600">×</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </article>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {LIMITS.map((item) => (
                <div key={item.title} className="rounded-2xl border border-slate-200 bg-white p-5">
                  <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
                  <p className="mt-2 text-xs leading-6 text-slate-500">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[.85fr_1.15fr] lg:items-center">
              <div>
                <span className="text-xs font-bold uppercase tracking-[.2em] text-teal-700">
                  Tiempos y validez
                </span>
                <h2 className="font-display mt-3 text-3xl font-extrabold tracking-[-.045em] text-slate-900 sm:text-4xl">
                  La validez no es permanente.
                </h2>
                <p className="mt-4 text-sm leading-7 text-slate-500">
                  La verificación caduca y debe renovarse. Si la evidencia deja de ser válida, el
                  estado cambia: no mantenemos un sello activo por inercia.
                </p>
                <ul className="mt-5 space-y-2 text-sm text-slate-600">
                  <li>✓ La empresa recibe el motivo de cada decisión.</li>
                  <li>✓ La renovación se solicita dentro de la ventana indicada.</li>
                  <li>✓ El sello refleja caducidad o revocación automáticamente.</li>
                </ul>
              </div>
              <VerificationFacts />
            </div>
          </div>
        </section>

        <section id="opiniones" className="bg-[#f4f7fa] py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div className="max-w-3xl">
              <span className="text-xs font-bold uppercase tracking-[.2em] text-teal-700">
                Política de opiniones
              </span>
              <h2 className="font-display mt-3 text-3xl font-extrabold tracking-[-.045em] text-slate-900 sm:text-4xl">
                Las opiniones pertenecen a los clientes.
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-500">
                Las empresas pueden responder públicamente, pero no ocultar ni editar reseñas. Los
                reportes se revisan por moderación y las decisiones quedan registradas.
              </p>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {OPINION_RULES.map((rule) => (
                <article
                  key={rule.title}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <h3 className="text-sm font-bold text-slate-900">{rule.title}</h3>
                  <p className="mt-2 text-xs leading-6 text-slate-500">{rule.text}</p>
                </article>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50/70 p-5 text-sm leading-7 text-slate-600">
              Las reseñas de baja valoración pueden pasar por un proceso de evidencias y resolución
              antes de publicarse. La media solo se calcula sobre opiniones que cumplen los criterios
              publicados y muestra el tamaño de muestra.
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-ink py-20 text-white lg:py-24">
          <div className="absolute -left-20 top-0 h-80 w-80 rounded-full bg-aqua/15 blur-3xl" />
          <div className="absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-blue-500/15 blur-3xl" />
          <div className="relative mx-auto max-w-4xl px-5 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-aqua/25 bg-aqua/10 px-4 py-2 text-xs font-bold tracking-widest text-aqua">
              CRITERIOS PÚBLICOS
            </span>
            <h2 className="font-display mt-6 text-3xl font-extrabold tracking-[-.05em] sm:text-5xl">
              Si lo publicamos,
              <br />
              podemos explicar por qué.
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              Consulta el Trust Center, revisa el proceso o solicita la verificación de tu empresa.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/trust-center"
                className="rounded-full bg-aqua px-6 py-3 text-sm font-bold text-ink transition hover:-translate-y-0.5 hover:bg-mint"
              >
                Ver Trust Center
              </Link>
              <Link
                href="/verificar-empresa"
                className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Solicitar verificación
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}

function CheckIcon({ name }: { name: string }) {
  if (name === 'identity') {
    return (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M12 3 20 6v5c0 5-3.4 8.3-8 10-4.6-1.7-8-5-8-10V6l8-3Z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
        <path d="m8.5 12 2.2 2.2 4.8-4.8" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      </svg>
    );
  }
  if (name === 'document') {
    return (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2Z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      </svg>
    );
  }
  if (name === 'activity') {
    return (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M3 12h4l2 5 4-10 2 5h6" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      </svg>
    );
  }
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path d="m5 12 4 4L19 6" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}
