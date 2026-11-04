import type { Metadata } from 'next';
import Link from 'next/link';
import PublicShell from '../../components/public/PublicShell';

export const metadata: Metadata = {
  title: 'Trust Center | FIVERTEN',
  description:
    'Metodología, estados de verificación, fuentes, seguridad y transparencia sobre cómo funciona FIVERTEN.',
};

export default function TrustCenterPage() {
  return (
    <PublicShell>
      <div className="space-y-8">
        <header className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Confianza</p>
          <h1 className="mt-2 text-3xl font-extrabold text-slate-900">Trust Center</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Transparencia sobre cómo verificamos empresas, qué significan los estados y cómo
            protegemos la información.
          </p>
        </header>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card
            title="Metodología"
            text="Revisión humana de identidad, documentación fiscal y evidencias. Criterios públicos y decisiones motivadas."
            href="/metodologia"
          />
          <Card
            title="Estados de verificación"
            text="Sin verificar, en revisión, verificada, rechazada y caducada. El sello refleja el estado efectivo en tiempo real."
            href="/como-funciona"
          />
          <Card
            title="Fuentes y evidencias"
            text="Documentos aportados por la empresa y proyectos verificables. Nunca publicamos documentos privados."
            href="/empresas"
          />
          <Card
            title="Seguridad"
            text="Cifrado de contraseñas, verificación en dos pasos, control de sesiones, límites de peticiones y aislamiento por empresa."
            href="#seguridad"
          />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-bold text-slate-900">Transparencia</h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-600">
            <li>Las empresas no pueden ocultar ni editar opiniones por sí mismas.</li>
            <li>Los reportes pasan por moderación independiente con historial de decisiones.</li>
            <li>La verificación caduca y debe renovarse; el sello deja de mostrarse como vigente.</li>
            <li>Las credenciales validadas se muestran por categoría, sin exponer archivos.</li>
          </ul>
        </section>

        <section
          id="seguridad"
          className="rounded-2xl border border-slate-200 bg-white p-6"
        >
          <h2 className="text-lg font-bold text-slate-900">Seguridad y protección de datos</h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-600">
            <li>Contraseñas con hash y verificación en dos pasos opcional.</li>
            <li>Sesiones revocables y control de intentos de acceso.</li>
            <li>Aislamiento de datos por empresa mediante políticas de acceso.</li>
            <li>Documentos de verificación privados: solo los revisa el equipo autorizado.</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-[#0b101b] p-6 text-white">
          <h2 className="text-lg font-bold">¿Necesitas más detalle?</h2>
          <p className="mt-1 text-sm text-slate-300">
            Consulta la metodología completa o contacta con el equipo.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/metodologia" className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-900">
              Ver metodología
            </Link>
            <Link href="/verificar-empresa" className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-white">
              Solicitar verificación
            </Link>
          </div>
        </section>
      </div>
    </PublicShell>
  );
}

function Card({ title, text, href }: { title: string; text: string; href: string }) {
  return (
    <Link href={href} className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-blue-300">
      <h2 className="text-base font-bold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm leading-relaxed text-slate-600">{text}</p>
    </Link>
  );
}
