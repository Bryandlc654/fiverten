import type { Metadata } from 'next';
import Link from 'next/link';
import PublicShell from '../../components/public/PublicShell';
import VerificationFacts from '../../components/public/VerificationFacts';

export const metadata: Metadata = {
  title: 'Metodología de verificación | FIVERTEN',
  description:
    'Criterios de aprobación, motivos de rechazo, validez, renovación y política de opiniones de FIVERTEN.',
};

const SECTIONS = [
  {
    title: 'Qué verificamos',
    items: [
      'Identidad del representante legal o apoderado.',
      'Documentación fiscal: CIF/NIF y datos de la empresa.',
      'Domicilio o comprobante de actividad.',
      'Al menos un proyecto o evidencia verificable.',
    ],
  },
  {
    title: 'Criterios de aprobación',
    items: [
      'Documentos legibles y vigentes.',
      'Datos fiscales coincidentes con el perfil.',
      'Evidencias coherentes con la actividad declarada.',
      'Sin señales de suplantación o documentación manipulada.',
    ],
  },
  {
    title: 'Motivos de rechazo',
    items: [
      'Documentación incompleta, ilegible o caducada.',
      'Datos que no coinciden con la empresa.',
      'Evidencias no verificables o insuficientes.',
      'Sospecha fundada de fraude o suplantación.',
    ],
  },
  {
    title: 'Validez y renovación',
    items: [
      'El sello tiene una validez limitada y debe renovarse.',
      'La renovación se solicita dentro de la ventana indicada en el proceso.',
      'Si caduca o se revoca, el sello cambia automáticamente.',
      'La empresa recibe el motivo en su panel.',
    ],
  },
];

export default function MethodologyPage() {
  return (
    <PublicShell>
      <div className="space-y-8">
        <header className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Metodología</p>
          <h1 className="mt-2 text-3xl font-extrabold text-slate-900">
            Criterios y políticas de verificación
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Estas reglas definen cómo FIVERTEN revisa y mantiene la verificación de empresas. Son
            públicas para que cualquier persona pueda entender el proceso.
          </p>
        </header>

        <VerificationFacts />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {SECTIONS.map((section) => (
            <section key={section.title} className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-base font-bold text-slate-900">{section.title}</h2>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                {section.items.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="material-symbols-outlined text-[17px] text-blue-600">check</span>
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <section id="opiniones" className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-bold text-slate-900">Política de opiniones</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Las opiniones pertenecen a los clientes. Las empresas pueden responder públicamente,
            pero no ocultar ni editar reseñas. Los reportes se revisan por moderación y las
            decisiones quedan registradas. Las reseñas de baja valoración pueden pasar por un
            proceso de evidencias y resolución antes de publicarse.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/trust-center" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
              Trust Center
            </Link>
            <Link href="/verificar-empresa" className="rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white">
              Solicitar verificación
            </Link>
          </div>
        </section>
      </div>
    </PublicShell>
  );
}
