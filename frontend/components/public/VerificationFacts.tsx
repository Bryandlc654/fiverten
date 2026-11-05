'use client';

import { useEffect, useState } from 'react';
import { api, type PublicVerificationInfo } from '../../lib/api';

export default function VerificationFacts() {
  const [info, setInfo] = useState<PublicVerificationInfo | null>(null);

  useEffect(() => {
    api
      .publicVerificationInfo()
      .then(setInfo)
      .catch(() =>
        setInfo({
          reviewDays: 5,
          expiryDays: 365,
          renewalDays: 30,
          minProjects: 1,
          requiredDocuments: ['identity', 'tax', 'address'],
        }),
      );
  }, []);

  if (!info) {
    return (
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className="h-20 animate-pulse rounded-2xl border border-slate-200 bg-white"
          />
        ))}
      </section>
    );
  }

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-xs text-slate-500">Plazo de revisión</p>
        <p className="mt-1 text-lg font-bold text-slate-900">{info.reviewDays} días hábiles</p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-xs text-slate-500">Validez del sello</p>
        <p className="mt-1 text-lg font-bold text-slate-900">{info.expiryDays} días</p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-xs text-slate-500">Renovación</p>
        <p className="mt-1 text-lg font-bold text-slate-900">Desde {info.renewalDays} días antes</p>
      </div>
    </section>
  );
}
