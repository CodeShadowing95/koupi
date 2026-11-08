'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { routes } from '@/lib/routes';

// « C'est ma page » pour un créateur déjà connecté : note la revendication, puis ouvre l'étape de preuve du Studio.
export function ClaimPageButton({ slug, name }: { slug: string; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function claim() {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/creator-claim', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ slug }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) { setError(typeof data.error === 'string' ? data.error : 'Impossible d’enregistrer ta demande.'); return; }
      router.push(`${routes.creatorSpace}#preuve`);
      router.refresh();
    } catch {
      setError('Pas de connexion. Réessaie dans un instant.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button type="button" className="k-btn k-btn-primary" onClick={claim} disabled={busy}>{busy ? 'Un instant…' : `Revendiquer la page ${name}`}</button>
      {error && <p className="k-req-error" role="alert">{error}</p>}
    </div>
  );
}
