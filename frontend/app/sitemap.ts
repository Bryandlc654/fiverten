import type { MetadataRoute } from 'next';
import { RESOURCES } from '../lib/resources';
import { API_URL } from '../lib/api';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://app-fiverten.onrender.com').replace(
  /\/+$/,
  '',
);

const STATIC_ROUTES = [
  '',
  '/empresas',
  '/verificar-empresa',
  '/como-funciona',
  '/trust-center',
  '/metodologia',
  '/soluciones',
  '/recursos',
  '/precios',
];

function apiBase(): string {
  return API_URL.startsWith('http') ? API_URL : `${SITE_URL}${API_URL}`;
}

async function companyRoutes(): Promise<string[]> {
  try {
    const response = await fetch(`${apiBase()}/public/organizations?pageSize=48`, {
      cache: 'no-store',
    });
    if (!response.ok) return [];
    const data = (await response.json()) as { items?: { slug: string }[] };
    return (data.items ?? []).flatMap((organization) => [
      `/empresa/${organization.slug}`,
      `/empresa/${organization.slug}/documentacion`,
      `/empresa/${organization.slug}/proyectos`,
      `/empresa/${organization.slug}/opiniones`,
      `/empresa/${organization.slug}/certificaciones`,
    ]);
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes = [...STATIC_ROUTES, ...RESOURCES.map((resource) => `/recursos/${resource.slug}`)];
  const companies = await companyRoutes();
  const now = new Date();
  return [...routes, ...companies].map((route) => ({
    url: `${SITE_URL}${route || '/'}`,
    lastModified: now,
    changeFrequency: route === '' || route === '/empresas' ? 'daily' : 'weekly',
    priority: route === '' ? 1 : route === '/empresas' ? 0.9 : 0.7,
  }));
}
