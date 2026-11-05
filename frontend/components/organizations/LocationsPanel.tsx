'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Alert, Field, inputClass } from '../ui';
import { ApiError, api, type OrganizationLocation } from '../../lib/api';

export default function LocationsPanel({ canEdit }: { canEdit: boolean }) {
  const [locations, setLocations] = useState<OrganizationLocation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [label, setLabel] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('');
  const [isPublic, setIsPublic] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.listOrganizationLocations();
      setLocations(data.locations);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudieron cargar las ubicaciones');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function create(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await api.createOrganizationLocation({
        label,
        addressLine: addressLine || undefined,
        city: city || undefined,
        postalCode: postalCode || undefined,
        country: country || undefined,
        isPrimary: (locations?.length ?? 0) === 0,
        isPublic,
      });
      setLabel('');
      setAddressLine('');
      setCity('');
      setPostalCode('');
      setCountry('');
      setIsPublic(false);
      setNotice('Ubicación añadida.');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo añadir la ubicación');
    } finally {
      setBusy(false);
    }
  }

  async function remove(location: OrganizationLocation) {
    setBusy(true);
    setError(null);
    try {
      await api.deleteOrganizationLocation(location.id);
      setNotice('Ubicación eliminada.');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo eliminar la ubicación');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-5 border-t border-slate-100 pt-5">
      <h3 className="text-sm font-bold text-slate-900">Ubicaciones</h3>
      <p className="mt-1 text-xs text-slate-500">
        Añade sedes o direcciones de actividad. La ubicación principal se usará en tu perfil.
      </p>

      {error && <Alert tone="error">{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}

      {canEdit && (
        <form onSubmit={create} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Nombre de la sede" className="block">
            <input
              required
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Oficina central"
              className={inputClass}
            />
          </Field>
          <Field label="Dirección" className="block">
            <input
              value={addressLine}
              onChange={(event) => setAddressLine(event.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Ciudad" className="block">
            <input
              value={city}
              onChange={(event) => setCity(event.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Código postal" className="block">
            <input
              value={postalCode}
              onChange={(event) => setPostalCode(event.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="País" className="block">
            <input
              value={country}
              onChange={(event) => setCountry(event.target.value)}
              className={inputClass}
            />
          </Field>
          <label className="flex items-start gap-2 text-xs text-slate-600 sm:col-span-2">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(event) => setIsPublic(event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300"
            />
            Mostrar esta ubicación en el perfil público.
          </label>
          <button
            type="submit"
            disabled={busy || !label.trim()}
            className="justify-self-start rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 sm:col-span-2"
          >
            Añadir ubicación
          </button>
        </form>
      )}

      <ul className="mt-4 divide-y divide-slate-100">
        {!locations ? (
          <li className="py-2 text-xs text-slate-500">Cargando ubicaciones…</li>
        ) : locations.length === 0 ? (
          <li className="py-2 text-xs text-slate-500">Todavía no hay ubicaciones.</li>
        ) : (
          locations.map((location) => (
            <li key={location.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900">
                  {location.label}
                  {location.isPrimary && (
                    <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                      Principal
                    </span>
                  )}
                  {location.isPublic && (
                    <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                      Pública
                    </span>
                  )}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {[location.addressLine, location.city, location.postalCode, location.country]
                    .filter(Boolean)
                    .join(' · ') || 'Sin dirección'}
                </p>
              </div>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => void remove(location)}
                  disabled={busy}
                  className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                >
                  Quitar
                </button>
              )}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
