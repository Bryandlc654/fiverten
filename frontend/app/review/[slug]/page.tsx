'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import PublicShell from '../../../components/public/PublicShell';
import { StarPicker } from '../../../components/reviews/Stars';
import { Alert, Field, inputClass } from '../../../components/ui';
import {
  ApiError,
  api,
  resolveAssetUrl,
  type ReviewForm,
  type ReviewRequestLookup,
} from '../../../lib/api';

interface FormState {
  rating: number;
  title: string;
  body: string;
  name: string;
  email: string;
  experienceDate: string;
  orderReference: string;
  projectId: string;
  consent: boolean;
  website: string;
}

const EMPTY: FormState = {
  rating: 0,
  title: '',
  body: '',
  name: '',
  email: '',
  experienceDate: '',
  orderReference: '',
  projectId: '',
  consent: false,
  website: '',
};

export default function WriteReviewPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? '';
  const [company, setCompany] = useState<ReviewForm | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [requestToken, setRequestToken] = useState<string | null>(null);
  const [request, setRequest] = useState<ReviewRequestLookup | null>(null);
  const [requestNotice, setRequestNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    api
      .reviewForm(slug)
      .then((data) => {
        setCompany(data);
        document.title = `Opina sobre ${data.tradeName} | FIVERTEN`;
      })
      .catch(() => setNotFound(true));
  }, [slug]);

  // Enlace personalizado (?rt=token): se valida, se marca la apertura y se
  // rellenan los datos del cliente. Si caducó o ya se usó, se avisa y se deja
  // escribir una reseña normal.
  useEffect(() => {
    if (!slug) return;
    const token = new URLSearchParams(window.location.search).get('rt');
    if (!token) return;
    api
      .reviewRequestLookup(slug, token)
      .then((data) => {
        setRequest(data);
        setForm((current) => ({
          ...current,
          name: data.reviewerName,
          email: data.reviewerEmail,
        }));
        if (data.completed) {
          setRequestNotice('Este enlace ya se utilizó para dejar una reseña.');
        } else {
          setRequestToken(token);
        }
      })
      .catch((err) => {
        setRequestNotice(
          err instanceof ApiError
            ? err.message
            : 'El enlace personalizado no es válido. Puedes escribir la reseña igualmente.',
        );
      });
  }, [slug]);

  const today = new Date().toISOString().slice(0, 10);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form.rating) {
      setError('Elige una puntuación de 1 a 5 estrellas');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.submitReview(slug, {
        rating: form.rating,
        title: form.title.trim() || undefined,
        body: form.body.trim(),
        name: form.name.trim(),
        email: form.email.trim(),
        experienceDate: form.experienceDate || undefined,
        orderReference: form.orderReference.trim() || undefined,
        projectId: form.projectId || undefined,
        consent: form.consent,
        website: form.website || undefined,
        requestToken: requestToken || undefined,
      });
      setSentTo(form.email.trim());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo enviar la reseña');
    } finally {
      setSubmitting(false);
    }
  }

  if (notFound) {
    return (
      <PublicShell>
        <div className="mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center">
          <h1 className="text-lg font-bold">Empresa no encontrada</h1>
          <p className="mt-1 text-sm text-slate-500">Revisa el enlace que te han enviado.</p>
        </div>
      </PublicShell>
    );
  }

  if (!company) {
    return (
      <PublicShell>
        <p className="text-sm text-slate-500">Cargando…</p>
      </PublicShell>
    );
  }

  if (sentTo) {
    return (
      <PublicShell>
        <div className="mx-auto max-w-lg rounded-xl border border-slate-200 bg-white p-8 text-center">
          <span className="material-symbols-outlined text-[44px] text-[#356CFF]">
            mark_email_unread
          </span>
          <h1 className="mt-2 text-xl font-bold">Revisa tu correo</h1>
          <p className="mt-2 text-sm text-slate-600">
            Te hemos enviado un enlace a <strong>{sentTo}</strong>. Tu reseña de{' '}
            <strong>{company.tradeName}</strong> se publicará cuando confirmes tu correo.
          </p>
          <p className="mt-3 text-xs text-slate-400">
            El enlace caduca en 7 días. Si no lo ves, mira en la carpeta de spam.
          </p>
        </div>
      </PublicShell>
    );
  }

  return (
    <PublicShell>
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center gap-4">
          {company.logoUrl ? (
            <Image
              src={resolveAssetUrl(company.logoUrl) ?? company.logoUrl}
              alt={company.tradeName}
              width={56}
              height={56}
              className="h-14 w-14 rounded-xl border border-slate-200 object-cover"
            />
          ) : (
            <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-600 text-xl font-bold text-white">
              {company.tradeName[0]?.toUpperCase()}
            </span>
          )}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Escribe una reseña
            </p>
            <h1 className="text-2xl font-bold text-slate-900">{company.tradeName}</h1>
            {company.isPublic && (
              <Link
                href={`/empresa/${company.slug}`}
                className="text-xs text-blue-700 hover:underline"
              >
                Ver el perfil y otras opiniones
              </Link>
            )}
          </div>
        </div>

        <form
          onSubmit={onSubmit}
          className="mt-6 space-y-5 rounded-xl border border-slate-200 bg-white p-6"
          noValidate
        >
          {request && !request.completed && (
            <div
              data-testid="review-request-banner"
              className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
            >
              <span className="material-symbols-outlined text-[20px] text-emerald-600">
                verified
              </span>
              <div>
                <p className="font-semibold">
                  Solicitud personalizada de {request.organization.tradeName}
                </p>
                <p className="text-xs text-emerald-700">
                  Tu nombre y correo ya están rellenados. Solo falta tu valoración y comentario.
                </p>
              </div>
            </div>
          )}
          {requestNotice && <Alert tone="info">{requestNotice}</Alert>}
          {error && <Alert tone="error">{error}</Alert>}

          <div>
            <p className="mb-1 text-xs font-semibold text-slate-600">
              ¿Cómo valorarías tu experiencia?
            </p>
            <StarPicker value={form.rating} onChange={(rating) => setForm({ ...form, rating })} />
          </div>

          <Field label="Título (opcional)">
            <input
              maxLength={255}
              placeholder="Resume tu experiencia en una frase"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className={inputClass}
            />
          </Field>

          <Field label="Tu reseña">
            <textarea
              required
              rows={6}
              maxLength={5000}
              placeholder="¿Qué tal fue? Cuenta lo que te gustó y lo que se podría mejorar."
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              className={inputClass}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Fecha de la experiencia (opcional)">
              <input
                type="date"
                max={today}
                value={form.experienceDate}
                onChange={(e) => setForm({ ...form, experienceDate: e.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label="Nº de pedido o reserva (opcional)">
              <input
                maxLength={100}
                value={form.orderReference}
                onChange={(e) => setForm({ ...form, orderReference: e.target.value })}
                className={inputClass}
              />
            </Field>
            {company.projects.length > 0 && (
              <Field label="Proyecto relacionado (opcional)">
                <select
                  value={form.projectId}
                  onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                  className={inputClass}
                >
                  <option value="">Experiencia general</option>
                  {company.projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <Field label="Tu nombre">
              <input
                required
                autoComplete="name"
                maxLength={200}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label="Tu correo electrónico">
              <input
                required
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={inputClass}
              />
            </Field>
          </div>
          <p className="-mt-2 text-xs text-slate-400">
            Tu correo no se publica: solo lo usamos para confirmar que la reseña es tuya. En la
            reseña aparecerá tu nombre y la inicial de tu apellido.
          </p>

          {/* Trampa para bots: invisible para las personas. */}
          <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
            <label>
              Sitio web
              <input
                tabIndex={-1}
                autoComplete="off"
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
              />
            </label>
          </div>

          <label className="flex items-start gap-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.consent}
              onChange={(e) => setForm({ ...form, consent: e.target.checked })}
              className="mt-0.5 h-4 w-4 rounded border-slate-300"
            />
            <span>
              Confirmo que esta reseña refleja mi experiencia real con {company.tradeName}, que no
              tengo relación con la empresa ni he recibido nada a cambio, y acepto que se publique.
            </span>
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-[18px]">send</span>
            {submitting ? 'Enviando…' : 'Enviar reseña'}
          </button>
        </form>
      </div>
    </PublicShell>
  );
}
