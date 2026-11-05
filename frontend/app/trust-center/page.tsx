import type { Metadata } from 'next';
import Link from 'next/link';
import HomeHeader from '../../components/public/HomeHeader';

export const metadata: Metadata = {
  title: 'Trust Center y metodología | FIVERTEN',
  description:
    'Qué verifica FIVERTEN, con qué fuentes, qué limitaciones existen, cómo se actualiza la información y qué significa cada estado público.',
};

const PILLARS = [
  {
    number: '01',
    title: 'Identidad',
    tag: 'Quién es la empresa',
    intro:
      'Comprobamos que la empresa y la persona que la representa existen y coinciden con los datos publicados.',
    points: [
      'Datos legales consultados: razón social, nombre comercial, CIF/NIF, domicilio fiscal y administrador o apoderado.',
      'Fuentes aceptadas: documentación oficial aportada por la empresa y registros públicos cuando estén disponibles.',
      'También revisamos coherencia entre el correo, el dominio y la actividad declarada.',
      '“Identidad verificada” significa que la identidad fue comprobada en el alcance y la fecha publicados; no certifica solvencia ni comportamiento futuro.',
    ],
    icon: 'badge',
  },
  {
    number: '02',
    title: 'Documentación',
    tag: 'Qué se revisa y qué no',
    intro:
      'Revisamos documentos concretos, su vigencia y su coherencia. La validación tiene un alcance limitado y explícito.',
    points: [
      'Documentos revisables: identidad, documentación fiscal, domicilio, licencias, seguros y certificados cuando aplican al sector.',
      'Se comprueba legibilidad, fecha, emisor, vigencia y coincidencia con los datos de la empresa.',
      'No se valida la autenticidad criptográfica de un documento salvo que se indique expresamente.',
      'Validar un documento no implica que la empresa cumpla todas sus obligaciones ni que un tercero deba aceptarlo.',
    ],
    icon: 'document',
  },
  {
    number: '03',
    title: 'Proyectos',
    tag: 'Empresa, proyecto y cliente',
    intro:
      'Un proyecto verificado necesita una relación comprobable entre la empresa, el trabajo realizado y el cliente.',
    points: [
      'Identidad del proyecto: título, tipo, ciudad o área, año, estado y empresa responsable.',
      'Evidencia mínima: al menos una prueba como contrato, presupuesto, factura, fotografías, certificado o acta.',
      'El estado del cliente puede ser identificado, confirmado o verificado, respetando su privacidad.',
      'Una opinión solo se enlaza al proyecto cuando existe una relación confirmada y trazable.',
    ],
    icon: 'project',
  },
  {
    number: '04',
    title: 'Opiniones',
    tag: 'Identidad, relación y moderación',
    intro:
      'Las opiniones se publican con contexto: quién las emite, qué relación existe y qué revisión se ha hecho.',
    points: [
      'IDENTIFIED: el canal de contacto o la identidad del autor está confirmado.',
      'CONFIRMED: existe un proyecto, contrato, factura o solicitud personalizada que acredita la relación.',
      'VERIFIED: además de la identidad y la relación, FIVERTEN ha revisado la experiencia con una metodología y deja trazabilidad.',
      'No se permiten incentivos, regalos o contraprestaciones a cambio de opiniones. Los reportes se moderan sin borrar automáticamente la opinión.',
    ],
    icon: 'reviews',
  },
  {
    number: '05',
    title: 'Actualización',
    tag: 'Vigencia y cambios',
    intro:
      'La confianza caduca. La información se revisa, se renueva o se marca como desactualizada cuando deja de ser vigente.',
    points: [
      'La verificación tiene una fecha de revisión y una fecha de validez publicadas.',
      'La renovación se solicita dentro de la ventana indicada en el proceso.',
      'Cada cambio de estado genera un evento con actor, fecha, estado anterior, estado nuevo, motivo y fuente.',
      'Si la evidencia caduca o se revoca, el sello y el perfil dejan de mostrarse como verificados.',
    ],
    icon: 'refresh',
  },
];

const STATES = [
  {
    name: 'VERIFIED',
    color: '#16A765',
    background: '#ecfdf5',
    border: '#a7f3d0',
    description:
      'Información revisada y vigente dentro del alcance publicado. Es el único estado que puede mostrarse como verificado.',
  },
  {
    name: 'PENDING',
    color: '#E7A61A',
    background: '#fffbeb',
    border: '#fde68a',
    description:
      'Revisión iniciada o actualización en curso. No debe mostrarse como verificado mientras no exista una decisión favorable.',
  },
  {
    name: 'EXPIRED',
    color: '#E5484D',
    background: '#fef2f2',
    border: '#fecaca',
    description:
      'Verificación caducada o evidencia fuera de vigencia. El sello deja de estar activo y el perfil debe indicar la caducidad.',
  },
  {
    name: 'NOT VERIFIED',
    color: '#64748b',
    background: '#f8fafc',
    border: '#e2e8f0',
    description:
      'Sin revisión suficiente. Es un estado neutral: no significa automáticamente que la empresa sea fraudulenta o de mala calidad.',
  },
];

export default function TrustCenterPage() {
  return (
    <div className="home-root min-h-screen bg-paper font-sans text-ink antialiased">
      <HomeHeader />

      <section className="home-noise relative isolate overflow-hidden bg-ink pb-20 pt-36 text-white lg:pb-24 lg:pt-44">
        <div className="home-grid-bg absolute inset-0 -z-10" />
        <div className="home-orb absolute -right-32 top-16 -z-10 h-[430px] w-[430px] rounded-full bg-aqua/15 blur-3xl" />
        <div className="home-orb home-orb-delay absolute -left-40 bottom-0 -z-10 h-[340px] w-[340px] rounded-full bg-blue-500/15 blur-3xl" />
        <div className="relative z-10 mx-auto max-w-7xl px-5 lg:px-8">
          <nav className="mb-7 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-400">
            <Link href="/" className="hover:text-white">
              Inicio
            </Link>
            <span className="text-slate-600">›</span>
            <span className="text-slate-300">Trust Center</span>
          </nav>

          <div className="grid items-end gap-10 lg:grid-cols-[1.15fr_.85fr]">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-aqua/25 bg-aqua/10 px-4 py-2 text-xs font-semibold tracking-wide text-aqua">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-aqua opacity-70" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-aqua" />
                </span>
                TRANSPARENCIA QUE SE PUEDE COMPROBAR
              </div>
              <h1 className="font-display max-w-3xl text-5xl font-extrabold leading-[1.04] tracking-[-.055em] sm:text-6xl">
                Trust Center
                <br />
                <span className="bg-gradient-to-r from-aqua via-mint to-white bg-clip-text text-transparent">
                  y metodología.
                </span>
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
                Qué verifica FIVERTEN, con qué fuentes, qué limitaciones existen y cómo se actualiza
                la información. Sin promesas de marketing: alcance, evidencia y estado real.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href="#pilares"
                  className="home-shine inline-flex items-center justify-center gap-2 rounded-full bg-aqua px-6 py-3 text-sm font-bold text-ink transition hover:-translate-y-0.5 hover:bg-mint"
                >
                  Ver los cinco pilares <span>→</span>
                </a>
                <Link
                  href="/metodologia"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:border-aqua/60 hover:bg-white/5"
                >
                  Criterios completos <span className="text-aqua">↗</span>
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
              <p className="text-xs font-bold uppercase tracking-[.18em] text-slate-400">
                Principio operativo
              </p>
              <p className="mt-3 text-base font-semibold leading-7 text-white">
                Ninguna empresa puede autoverificarse. La revisión es humana, documentada y
                trazable.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-4 text-xs text-slate-400">
                <div>
                  <p className="text-lg font-bold text-aqua">5</p>
                  <p>pilares públicos</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-aqua">4</p>
                  <p>estados visibles</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-aqua">100%</p>
                  <p>decisiones con motivo</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-aqua">0</p>
                  <p>incentivos por reseñas</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main>
        <section className="bg-white py-16 lg:py-20">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr]">
              <div>
                <span className="text-xs font-bold uppercase tracking-[.2em] text-teal-700">
                  Para qué sirve
                </span>
                <h2 className="font-display mt-3 text-3xl font-extrabold tracking-[-.045em] text-slate-900 sm:text-4xl">
                  No es una página de marketing.
                </h2>
                <p className="mt-4 text-sm leading-7 text-slate-500">
                  El Trust Center explica el sistema de verificación para que clientes, empresas y
                  equipos de revisión puedan entender qué hay detrás de un sello, qué se ha
                  comprobado y qué no.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <InfoBox
                  title="Qué sí hace"
                  text="Documenta fuentes, fechas, alcance, metodología y limitaciones de cada revisión."
                  tone="positive"
                />
                <InfoBox
                  title="Qué no hace"
                  text="No garantiza solvencia, calidad futura, cumplimiento total ni comportamiento comercial."
                  tone="neutral"
                />
                <InfoBox
                  title="Cómo se mantiene"
                  text="Cada cambio de estado genera un evento con actor, motivo y evidencia."
                  tone="positive"
                />
                <InfoBox
                  title="Cómo se corrige"
                  text="Los conflictos se reportan, se revisan y quedan registrados sin borrar el historial."
                  tone="neutral"
                />
              </div>
            </div>
          </div>
        </section>

        <section id="pilares" className="bg-[#f4f7fa] py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div className="max-w-3xl">
              <span className="text-xs font-bold uppercase tracking-[.2em] text-teal-700">
                Cinco pilares
              </span>
              <h2 className="font-display mt-3 text-3xl font-extrabold tracking-[-.045em] text-slate-900 sm:text-4xl">
                Qué verificamos y con qué límites.
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-500">
                Cada pilar responde a una pregunta concreta. La información publicada solo debe
                interpretarse dentro del alcance y la fecha que la acompañan.
              </p>
            </div>

            <div className="mt-10 space-y-4">
              {PILLARS.map((pillar) => (
                <article
                  key={pillar.number}
                  className="grid gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:grid-cols-[80px_1fr_1.2fr] lg:items-start"
                >
                  <div className="flex items-center gap-3 lg:block">
                    <span className="grid h-14 w-14 place-items-center rounded-2xl bg-ink font-display text-xl font-extrabold text-aqua shadow-lg">
                      {pillar.number}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 lg:mt-3 lg:block">
                      {pillar.tag}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <PillarIcon name={pillar.icon} />
                      <h3 className="font-display text-xl font-extrabold text-slate-900">
                        {pillar.title}
                      </h3>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{pillar.intro}</p>
                  </div>
                  <ul className="space-y-2.5 rounded-xl bg-slate-50 p-4 text-xs leading-6 text-slate-600">
                    {pillar.points.map((point) => (
                      <li key={point} className="flex gap-2">
                        <span className="mt-0.5 text-emerald-600">✓</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="estados" className="bg-white py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div className="max-w-3xl">
              <span className="text-xs font-bold uppercase tracking-[.2em] text-teal-700">
                Estados públicos
              </span>
              <h2 className="font-display mt-3 text-3xl font-extrabold tracking-[-.045em] text-slate-900 sm:text-4xl">
                Cada estado significa algo distinto.
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-500">
                El estado debe reflejar la realidad de la revisión. Nunca se debe mostrar PENDING o
                NOT VERIFIED como si fueran una verificación vigente.
              </p>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {STATES.map((state) => (
                <article
                  key={state.name}
                  className="rounded-2xl border p-5"
                  style={{ borderColor: state.border, background: state.background }}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="rounded-full px-2.5 py-1 text-[10px] font-extrabold tracking-wider text-white"
                      style={{ background: state.color }}
                    >
                      {state.name}
                    </span>
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: state.color }} />
                  </div>
                  <p className="mt-4 text-xs leading-6 text-slate-600">{state.description}</p>
                </article>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-7 text-slate-600">
              <strong className="text-slate-900">Regla de visualización:</strong> VERIFIED puede
              mostrarse como verificado. PENDING comunica revisión en curso. EXPIRED comunica
              caducidad. NOT VERIFIED es neutral y no debe presentarse como una acusación.
            </div>
          </div>
        </section>

        <section className="bg-[#f4f7fa] py-20 lg:py-24">
          <div className="mx-auto grid max-w-7xl gap-8 px-5 lg:grid-cols-2 lg:px-8">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <span className="text-xs font-bold uppercase tracking-[.2em] text-teal-700">
                Fuentes y limitaciones
              </span>
              <h2 className="font-display mt-3 text-2xl font-extrabold text-slate-900">
                Qué hay detrás de una verificación.
              </h2>
              <div className="mt-5 space-y-4 text-sm leading-7 text-slate-600">
                <p>
                  <strong className="text-slate-900">Fuentes.</strong> Documentación aportada por la
                  empresa, registros públicos cuando estén disponibles, proyectos con evidencias y
                  solicitudes personalizadas de clientes.
                </p>
                <p>
                  <strong className="text-slate-900">Limitaciones.</strong> La verificación no
                  sustituye una auditoría financiera, una garantía legal ni una evaluación de
                  solvencia. Solo acredita lo indicado en el alcance publicado.
                </p>
                <p>
                  <strong className="text-slate-900">Datos desactualizados.</strong> Si la evidencia
                  deja de estar vigente, el estado pasa a EXPIRED o deja de mostrarse como verificado.
                  No se conserva un sello activo por inercia.
                </p>
                <p>
                  <strong className="text-slate-900">Correcciones.</strong> Cualquier conflicto se
                  puede reportar. La moderación revisa el caso y conserva el historial de decisiones.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <span className="text-xs font-bold uppercase tracking-[.2em] text-teal-700">
                Actualización
              </span>
              <h2 className="font-display mt-3 text-2xl font-extrabold text-slate-900">
                La confianza tiene fecha.
              </h2>
              <div className="mt-5 space-y-4">
                {[
                  ['Revisión inicial', 'Identidad, documentación y primer proyecto o evidencia.'],
                  ['Renovación', 'La empresa solicita la revisión dentro de la ventana de renovación.'],
                  ['Cambios', 'Cada cambio de estado genera un evento con motivo y trazabilidad.'],
                  ['Caducidad', 'Si la validez termina, el sello y el perfil reflejan el estado real.'],
                ].map(([title, text]) => (
                  <div key={title} className="flex gap-3 rounded-xl bg-slate-50 p-4">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-aqua" />
                    <div>
                      <p className="text-sm font-bold text-slate-900">{title}</p>
                      <p className="mt-0.5 text-xs leading-6 text-slate-500">{text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-ink py-20 text-white lg:py-24">
          <div className="mx-auto max-w-4xl px-5 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-aqua/25 bg-aqua/10 px-4 py-2 text-xs font-bold tracking-widest text-aqua">
              TRANSPARENCIA OPERATIVA
            </span>
            <h2 className="font-display mt-6 text-3xl font-extrabold tracking-[-.05em] sm:text-5xl">
              La confianza se demuestra
              <br />
              con evidencia y límites claros.
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              Consulta los criterios completos, revisa una empresa o solicita una verificación.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/metodologia"
                className="rounded-full bg-aqua px-6 py-3 text-sm font-bold text-ink transition hover:-translate-y-0.5 hover:bg-mint"
              >
                Ver metodología
              </Link>
              <Link
                href="/empresas"
                className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Explorar empresas
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

      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-400">
        FIVERTEN · Trust Center y metodología pública · La información mostrada depende del alcance y
        la fecha de cada revisión.
      </footer>
    </div>
  );
}

function InfoBox({
  title,
  text,
  tone,
}: {
  title: string;
  text: string;
  tone: 'positive' | 'neutral';
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        tone === 'positive'
          ? 'border-emerald-200 bg-emerald-50/60'
          : 'border-slate-200 bg-slate-50'
      }`}
    >
      <p className="text-sm font-bold text-slate-900">{title}</p>
      <p className="mt-2 text-xs leading-6 text-slate-600">{text}</p>
    </div>
  );
}

function PillarIcon({ name }: { name: string }) {
  const className = 'h-5 w-5 text-teal-700';
  if (name === 'badge') {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M12 3 20 6v5c0 5-3.4 8.3-8 10-4.6-1.7-8-5-8-10V6l8-3Z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
        <path d="m8.5 12 2.2 2.2 4.8-4.8" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      </svg>
    );
  }
  if (name === 'document') {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      </svg>
    );
  }
  if (name === 'project') {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      </svg>
    );
  }
  if (name === 'reviews') {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M4 5h16v12H7l-3 3V5Z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
        <path d="m8 10 2.5 2.5L16 8" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      </svg>
    );
  }
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path d="M20 11a8.1 8.1 0 00-15.5-2M4 4v5h5M4 13a8.1 8.1 0 0015.5 2M20 20v-5h-5" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}
