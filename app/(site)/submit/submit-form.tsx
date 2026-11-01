'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { Turnstile, type TurnstileHandle } from '@/components/turnstile';
import type { Category } from '@/lib/data';
import { routes } from '@/lib/routes';

const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';

export function SubmitForm({ categories }: { categories: Category[] }) {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [token, setToken] = useState('');
  const turnstile = useRef<TurnstileHandle>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setError('');
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ toolName: form.get('tool'), creatorName: form.get('creator'), code: form.get('code'), discountLabel: form.get('discount'), sourceUrl: form.get('source'), category: form.get('category'), comment: form.get('comment'), turnstileToken: token }),
      });
      const body = await response.json() as { error?: string };
      if (!response.ok) { setError(body.error || 'La proposition n’a pas pu être envoyée.'); setSending(false); turnstile.current?.reset(); return; }
      setSent(true);
    } catch {
      setError('La proposition n’a pas pu être envoyée. Vérifie ta connexion et réessaie.');
      setSending(false);
      turnstile.current?.reset();
    }
  }

  if (sent) {
    return (
      <main className="k-page">
        <div className="k-wrap k-page-head">
          <span className="k-eyebrow">Merci</span>
          <h1>Ton code est dans la file.</h1>
          <p>On regarde la source et on le teste avant de le publier, en général sous 48 h.</p>
          <Link className="k-btn k-btn-paper k-btn-ticket" href={routes.home} style={{ alignSelf: 'flex-start' }}>Retour à l&apos;accueil</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="k-page">
      <div className="k-wrap k-split">
        <div className="k-page-head" style={{ marginBottom: 0 }}>
          <span className="k-eyebrow">Contribuer</span>
          <h1>Tu as vu passer un code ?</h1>
          <p>On publie seulement les codes donnés par un créateur, avec la preuve. Pas de codes de parrainage personnels.</p>
          <div className="k-panel" style={{ marginTop: 12 }}>
            <span className="k-eyebrow">Pourquoi un lien source ?</span>
            <p>Il nous sert à créditer la bonne personne et à vérifier que le code a bien été donné en public. Sans lien, la proposition est refusée.</p>
          </div>
        </div>
        <form className="k-form" onSubmit={submit}>
          <div className="k-field"><label htmlFor="tool">Outil</label><input id="tool" name="tool" required placeholder="Ex. Hostinger" /></div>
          <div className="k-field"><label htmlFor="creator">Créateur</label><input id="creator" name="creator" required placeholder="Nom de la chaîne ou du compte" /></div>
          <div className="k-field-row">
            <div className="k-field"><label htmlFor="code">Code promo</label><input id="code" name="code" required placeholder="Ex. MONCODE10" className="k-mono" /></div>
            <div className="k-field"><label htmlFor="discount">Réduction annoncée</label><input id="discount" name="discount" required placeholder="Ex. -10 %" /></div>
          </div>
          <div className="k-field"><label htmlFor="category">Catégorie</label><select id="category" name="category" defaultValue=""><option value="">Je ne sais pas</option>{categories.map(category => <option key={category.slug} value={category.name}>{category.name}</option>)}</select></div>
          <div className="k-field"><label htmlFor="source">Lien de la vidéo ou du post</label><input id="source" name="source" type="url" required placeholder="https://…" /><small>Idéalement avec le moment où le code est donné.</small></div>
          <div className="k-field"><label htmlFor="comment">Commentaire (facultatif)</label><textarea id="comment" name="comment" rows={3} /></div>
          {turnstileSiteKey && <Turnstile ref={turnstile} siteKey={turnstileSiteKey} onToken={setToken} />}
          {error && <div className="k-notice k-notice-error" role="alert">{error}</div>}
          <button className="k-btn k-btn-primary" style={{ minHeight: 54 }} type="submit" disabled={sending || (Boolean(turnstileSiteKey) && !token)}>{sending ? 'Envoi…' : 'Envoyer pour vérification'}</button>
        </form>
      </div>
    </main>
  );
}
