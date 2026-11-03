'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Turnstile, type TurnstileHandle } from '@/components/turnstile';
import { routes } from '@/lib/routes';

// « C'est ta page ? » et « Signaler une erreur » sur la page d'un créateur.
// Une fenêtre (dialog natif : focus gardé dedans, Échap pour fermer) avec un petit formulaire.
// « C'est ta page ? » mène à /for-creators (connexion par lien, ADR-0021). Le signalement arrive dans l'admin.

const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';
type Kind = 'claim' | 'report';

const COPY: Record<Kind, { title: string; lead: string; done: string }> = {
  claim: {
    title: 'C’est ta page ?',
    lead: 'Laisse ton e-mail et le lien de ton compte. On te recontacte pour vérifier que le compte est bien le tien, puis tu pourras gérer tes codes toi-même. C’est gratuit.',
    done: 'Demande reçue. On te répond par e-mail, en général sous 48 h.',
  },
  report: {
    title: 'Signaler une erreur',
    lead: 'Mauvais nom, compte qui n’est pas le sien, code qui ne vient pas de lui : dis-nous ce qui ne va pas.',
    done: 'Merci, on regarde ça.',
  },
};

export function CreatorRequest({ slug, name }: { slug: string; name: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const turnstile = useRef<TurnstileHandle>(null);
  const [kind, setKind] = useState<Kind | null>(null);
  const [state, setState] = useState<'form' | 'sending' | 'sent'>('form');
  const [error, setError] = useState('');
  const [token, setToken] = useState('');

  useEffect(() => { if (kind) dialog.current?.showModal(); }, [kind]);

  const open = (next: Kind) => { setState('form'); setError(''); setToken(''); setKind(next); };
  const close = () => { dialog.current?.close(); };

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!kind) return;
    setState('sending');
    setError('');
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/creator-requests', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kind, slug, email: form.get('email'), accountUrl: form.get('accountUrl'), message: form.get('message'), turnstileToken: token }),
      });
      const body = await response.json() as { error?: string };
      if (!response.ok) { setError(body.error || 'La demande n’a pas pu être envoyée.'); setState('form'); turnstile.current?.reset(); return; }
      setState('sent');
    } catch {
      setError('La demande n’a pas pu être envoyée. Vérifie ta connexion et réessaie.');
      setState('form');
      turnstile.current?.reset();
    }
  }

  const copy = kind ? COPY[kind] : null;
  return (
    <>
      <p className="k-creator-request">
        <Link className="k-link-btn is-strong" href={routes.forCreators(slug)}>C’est ta page ? Revendique-la</Link>
        <span aria-hidden="true">·</span>
        <button type="button" className="k-link-btn" onClick={() => open('report')}>Signaler une erreur</button>
      </p>
      <dialog ref={dialog} className="k-req-dialog" aria-labelledby="creator-request-title" onClose={() => setKind(null)}
        onClick={event => { if (event.target === dialog.current) close(); }}>
        {copy && (
          <div className="k-req-body">
            <button type="button" className="k-req-close" aria-label="Fermer" onClick={close}>×</button>
            <span className="k-eyebrow">{name}</span>
            <h2 id="creator-request-title">{copy.title}</h2>
            {state === 'sent' ? (
              <>
                <p role="status">{copy.done}</p>
                <button type="button" className="k-btn k-btn-ghost" onClick={close}>Fermer</button>
              </>
            ) : (
              <form onSubmit={submit}>
                <p>{copy.lead}</p>
                {kind === 'claim' && (
                  <div className="k-field">
                    <label htmlFor="req-account">Lien de ton compte</label>
                    <input id="req-account" name="accountUrl" type="url" inputMode="url" required maxLength={1000} placeholder="https://www.youtube.com/@tachaine" />
                  </div>
                )}
                <div className="k-field">
                  <label htmlFor="req-email">Ton e-mail{kind === 'report' && <span className="k-req-optional"> (facultatif)</span>}</label>
                  <input id="req-email" name="email" type="email" autoComplete="email" required={kind === 'claim'} maxLength={320} placeholder="toi@exemple.fr" />
                </div>
                <div className="k-field">
                  <label htmlFor="req-message">{kind === 'claim' ? 'Un mot pour nous' : 'Ce qui ne va pas'}{kind === 'claim' && <span className="k-req-optional"> (facultatif)</span>}</label>
                  <textarea id="req-message" name="message" required={kind === 'report'} maxLength={1000} placeholder={kind === 'claim' ? 'Ex. Je suis bien l’auteur de cette chaîne.' : 'Ex. Le code NORD20 ne vient pas de lui.'} />
                </div>
                <p className="k-req-privacy">Ton e-mail sert seulement à te répondre. On ne l’affiche nulle part.</p>
                {turnstileSiteKey && <Turnstile ref={turnstile} siteKey={turnstileSiteKey} onToken={setToken} />}
                {error && <p className="k-req-error" role="alert">{error}</p>}
                <div className="k-req-actions">
                  <button type="submit" className="k-btn k-btn-primary" disabled={state === 'sending' || (Boolean(turnstileSiteKey) && !token)}>{state === 'sending' ? 'Envoi…' : 'Envoyer'}</button>
                  <button type="button" className="k-btn k-btn-ghost" onClick={close}>Annuler</button>
                </div>
              </form>
            )}
          </div>
        )}
      </dialog>
    </>
  );
}
