import Image from 'next/image';
import Link from 'next/link';

const EXPLORE_LINKS = [
  { href: '/empresas', label: 'Directorio de empresas' },
  { href: '/como-funciona', label: 'Cómo funciona' },
  { href: '/soluciones', label: 'Soluciones' },
  { href: '/recursos', label: 'Recursos y guías' },
];

const TRUST_LINKS = [
  { href: '/trust-center', label: 'Trust Center' },
  { href: '/trust-center#estados', label: 'Estados de verificación' },
  { href: '/metodologia', label: 'Metodología' },
  { href: '/metodologia#opiniones', label: 'Política de opiniones' },
];

const COMPANY_LINKS = [
  { href: '/verificar-empresa', label: 'Verificar empresa' },
  { href: '/precios', label: 'Planes y precios' },
  { href: '/login', label: 'Acceso empresas' },
  { href: '/trust-center#pilares', label: 'Cómo verificamos' },
];

export default function PublicFooter() {
  return (
    <footer className="bg-[#06101e] py-12 text-white">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="grid gap-10 border-b border-white/10 pb-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Link href="/" className="flex items-center gap-2.5">
              <Image
                src="/logo-fiverten.png"
                alt="FIVERTEN"
                width={2000}
                height={347}
                className="h-8 w-auto"
              />
            </Link>
            <p className="mt-5 max-w-xs text-sm leading-6 text-slate-400">
              Reputación verificable para decisiones más confiables. Empresas verificadas, evidencia
              comprobable y opiniones con contexto.
            </p>
            <p className="mt-4 max-w-xs text-xs leading-6 text-slate-500">
              La verificación no garantiza solvencia ni comportamiento futuro: acredita el alcance y
              la fecha publicados.
            </p>
          </div>

          <FooterColumn title="Explorar" links={EXPLORE_LINKS} />
          <FooterColumn title="Transparencia" links={TRUST_LINKS} />
          <FooterColumn title="Para empresas" links={COMPANY_LINKS} />
        </div>

        <div className="flex flex-col justify-between gap-3 pt-7 text-xs text-slate-500 sm:flex-row">
          <p>© {new Date().getFullYear()} FIVERTEN. Todos los derechos reservados.</p>
          <p>La confianza se demuestra con hechos.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div>
      <p className="text-sm font-bold text-white">{title}</p>
      <ul className="mt-5 space-y-3 text-sm text-slate-400">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="transition hover:text-aqua">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
