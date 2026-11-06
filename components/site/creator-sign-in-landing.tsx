'use client';
import Link from '@/components/site/site-pages';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { routes } from '@/lib/routes';

// Utilise le jeton du lien dès l'ouverture de la page, puis file vers l'espace du créateur.
// Le jeton passe en POST : un antivirus de messagerie qui « ouvre » le lien sans JavaScript ne le grille pas.
export function CreatorSignInLanding({ token }: { token: string }) {
  const router = useRouter();
  const started = useRef(false);
  const [error, setError] = useState(token ? '' : 'Ce lien est incomplet. Demande-en un nouveau, ça prend dix secondes.');

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    (async () => {
      try {
        const response = await fetch('/api/creator-auth/verify', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token }) });
        const body = await response.json().catch(() => ({})) as { error?: string };
        if (!response.ok) { setError(body.error || 'La connexion a échoué.'); return; }
        router.replace(routes.creatorSpace);
        router.refresh();
      } catch {
        setError('La connexion a échoué. Vérifie ta connexion et réessaie.');
      }
    })();
  }, [token, router]);

  return (
    <div className="k-panel k-panel-glow k-fc-landing-card" role={error ? 'alert' : 'status'}>
      {error ? (
        <>
          <h1>{token ? 'Lien expiré' : 'Lien incomplet'}</h1>
          <p>{error}</p>
          <Link className="k-btn k-btn-primary" href={routes.forCreators()}>Recevoir un nouveau lien</Link>
        </>
      ) : (
        <>
          <span className="k-fc-spinner" aria-hidden="true" />
          <h1>On t’ouvre ton espace…</h1>
          <p>Une seconde, on prépare tes chiffres.</p>
        </>
      )}
    </div>
  );
}
