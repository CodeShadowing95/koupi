'use client';
// « Actualiser » en haut d'une liste de l'admin : relit les données sans recharger la page ni perdre les filtres.
// Sans onRefresh, la page serveur est relue (router.refresh) ; avec, la liste se recharge elle-même.
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export function RefreshButton({ onRefresh }: { onRefresh?: () => Promise<void> }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);
  const busy = pending || loading;
  async function refresh() {
    if (!onRefresh) { startTransition(() => router.refresh()); return; }
    setLoading(true);
    try { await onRefresh(); } finally { setLoading(false); }
  }
  return (
    <button type="button" className="adm-btn adm-refresh" onClick={refresh} disabled={busy} aria-busy={busy} title="Relire la liste">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 11a8 8 0 1 0-2.3 5.7" /><path d="M20 4v7h-7" />
      </svg>
      {busy ? 'Actualisation…' : 'Actualiser'}
    </button>
  );
}
