import type { Metadata } from 'next';
import Link from 'next/link';
import PublicShell from '../../components/public/PublicShell';
import VerificationFacts from '../../components/public/VerificationFacts';

export const metadata: Metadata = {
  title: 'Cómo funciona la verificación | FIVERTEN',
  description:
    'Proceso completo de verificación de empresas: documentación, evidencias, revisión humana, sello dinámico y renovación.',
};

const STEPS = [
  {
    title: 'Registro de la empresa',
    text: 'La empresa crea su cuenta, define su perfil y activa su página pública.',
  },
  {
    title: 'Solicitud de verificación',
    text: 'Desde el panel se inicia la solicitud y se aceptan las condiciones del proceso.',
  },
  {
    title: 'Documentación',
    text: 'Se suben documentos de identidad, fiscales y de domicilio. Son privados: solo los revisa FIVERTEN.',
  },
  {
    title: 'Proyectos y evidencias',
    text: 'La empresa registra proyectos y adjunta imágenes o PDF que demuestren su actividad.',
  },
  {
    title: 'Revisión y activación',
    text: 'FIVERTEN revisa, aprueba o rechaza con motivo. Si se aprueba, se activa el sello dinámico.',
  },
];

export default function HowItWorksPage() {
  return (
    <PublicShell>
      <div className="space-y-8">
        <header className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">
            Proceso de verificación
          </p>
          <h1 className="mt-2 text-3xl font-extrabold text-slate-900">Cómo funciona FIVERTEN</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            La verificación es humana y documental. Ninguna empresa puede autoverificarse: el
            equipo de FIVERTEN revisa la información y decide. El sello refleja siempre el estado
            real.
          </p>
        </header>

        <ol className="space-y-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0b101b] text-sm font-bold text-white">
                {index + 1}
              </span>
              <div>
                <h2 className="text-base font-bold text-slate-900">{step.title}</h2>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>

        <VerificationFacts />

        <section className="rounded-2xl border border-blue-200 bg-blue-50 p-6">
          <h2 className="text-lg font-bold text-slate-900">¿Qué ocurre al obtener el sello?</h2>
          <ul className="mt-3 grid grid-cols-1 gap-2 text-sm text-slate-700 sm:grid-cols-2">
            <li>Descarga en PNG y SVG.</li>
            <li>Código embed para tu web.</li>
            <li>Estado de verificación en tu panel.</li>
            <li>Actualización automática si caduca o se revoca.</li>
          </ul>
          <Link
            href="/verificar-empresa"
            className="mt-5 inline-flex rounded-lg bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-600"
          >
            Solicitar verificación
          </Link>
        </section>
      </div>
    </PublicShell>
  );
}
