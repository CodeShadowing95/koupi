'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { routes } from '@/lib/routes';

// « Passer cette étape » : un nom de créateur, et le studio s'ouvre. Si une page porte déjà ce nom,
// on la montre avec « C'est moi » (revendication) plutôt que de créer un doublon.
export function StudioSkip({ suggested }: { suggested: string }) {
  const router = useRouter();
  const [name, setName] = useState(suggested);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [match, setMatch] = useState<{ slug: string; name: string } | null>(null);

  async function start(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMatch(null);
    try {
      const response = await fetch('/api/creator-start', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Impossible d’ouvrir ton studio.');
        if (data.match && typeof data.match.slug === 'string') setMatch(data.match);
        return;
      }
      router.refresh();
    } catch {
      setError('Pas de connexion. Réessaie dans un instant.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="k-st-skip" onSubmit={start}>
      <label htmlFor="k-st-own">Ton nom de créateur</label>
      <div className="k-st-find">
        <input id="k-st-own" value={name} onChange={event => setName(event.target.value)} maxLength={60} minLength={2} required placeholder="Le nom sous lequel tu publies" />
        <button type="submit" className="k-btn k-btn-ghost" disabled={busy}>{busy ? 'Un instant…' : 'Ouvrir mon studio'}</button>
      </div>
      {error && <p className="k-req-error" role="alert">{error}</p>}
      {match && (
        <p className="k-st-muted"><Link className="k-btn k-btn-primary" href={routes.forCreators(match.slug)}>C’est moi : revendiquer « {match.name} »</Link></p>
      )}
    </form>
  );
}

// « Fais vérifier ta chaîne » : le créateur d'une page non vérifiée colle le lien de sa chaîne. L'admin l'ajoute à sa page
// et la contrôle ; le code de preuve apparaît ensuite dans le Studio.
export function VerifyRequest({ slug }: { slug: string }) {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function send(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/creator-claim', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ slug, accountUrl: url }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) { setError(typeof data.error === 'string' ? data.error : 'Impossible d’envoyer ta demande.'); return; }
      router.refresh();
    } catch {
      setError('Pas de connexion. Réessaie dans un instant.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="k-st-skip" onSubmit={send}>
      <label htmlFor="k-st-channel">Le lien de ta chaîne ou de ton profil</label>
      <div className="k-st-find">
        <input id="k-st-channel" type="url" inputMode="url" value={url} onChange={event => setUrl(event.target.value)} maxLength={1000} required placeholder="https://www.youtube.com/@tachaine" />
        <button type="submit" className="k-btn k-btn-primary" disabled={busy}>{busy ? 'Envoi…' : 'Faire vérifier'}</button>
      </div>
      {error && <p className="k-req-error" role="alert">{error}</p>}
    </form>
  );
}
