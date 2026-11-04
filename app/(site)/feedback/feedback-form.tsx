'use client';
// Formulaire de la page « Ton avis » : un type (remarque, idée, problème), un message et un e-mail facultatif.
// Protégé comme les autres formulaires publics (Turnstile, limite d'envois). L'avis arrive dans l'admin, page Retours.
import { useEffect, useRef, useState } from 'react';
import Link from '@/components/site/site-pages';
import { Turnstile, type TurnstileHandle } from '@/components/turnstile';
import { routes } from '@/lib/routes';

const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';
const MAX = 2000;

const KINDS = [
  { value: 'remark', label: 'Une remarque', hint: 'Ce qui t’a plu ou gêné', placeholder: 'Ex. La page d’un outil est claire, mais j’ai mis du temps à trouver le bouton Copier.' },
  { value: 'idea', label: 'Une idée', hint: 'Ce qui manque à Merkod', placeholder: 'Ex. Recevoir un e-mail quand un code arrive pour Notion.' },
  { value: 'problem', label: 'Un problème', hint: 'Quelque chose ne marche pas', placeholder: 'Ex. Le code NORD20 est refusé au paiement depuis hier.' },
] as const;
type Kind = typeof KINDS[number]['value'];

export function FeedbackForm() {
  const turnstile = useRef<TurnstileHandle>(null);
  const [kind, setKind] = useState<Kind>('remark');
  const [message, setMessage] = useState('');
  const [token, setToken] = useState('');
  const [state, setState] = useState<'form' | 'sending' | 'sent'>('form');
  const [error, setError] = useState('');
  const [fromPath, setFromPath] = useState('');

  // La page d'où vient le visiteur, si c'est une page de Merkod : elle aide à comprendre une remarque.
  // Le lien du menu la passe dans ?from= ; sinon (pied de page, lien direct) on lit la page précédente du navigateur.
  // Le serveur ne garde de toute façon qu'un chemin du site.
  useEffect(() => {
    try {
      const param = new URLSearchParams(window.location.search).get('from');
      if (param?.startsWith('/') && !param.startsWith('//')) { setFromPath(param); return; }
      const from = document.referrer ? new URL(document.referrer) : null;
      if (from && from.origin === window.location.origin && from.pathname !== routes.feedback) setFromPath(from.pathname);
    } catch { /* adresse illisible : on s'en passe */ }
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState('sending');
    setError('');
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kind, message, email: form.get('email'), fromPath, turnstileToken: token }),
      });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) { setError(body.error || 'Ton avis n’a pas pu être envoyé.'); setState('form'); turnstile.current?.reset(); return; }
      setState('sent');
    } catch {
      setError('Ton avis n’a pas pu être envoyé. Vérifie ta connexion et réessaie.');
      setState('form');
      turnstile.current?.reset();
    }
  }

  if (state === 'sent') {
    return (
      <div className="k-panel k-fb-done" role="status">
        <h2>Merci, c’est bien reçu.</h2>
        <p>On lit chaque avis. Si tu as laissé ton e-mail et que ta remarque appelle une réponse, on t’écrit.</p>
        <div className="k-req-actions">
          <Link className="k-btn k-btn-primary" href={routes.codes}>Voir les codes</Link>
          <button type="button" className="k-btn k-btn-ghost" onClick={() => { setMessage(''); setToken(''); setState('form'); }}>Envoyer un autre avis</button>
        </div>
      </div>
    );
  }

  const current = KINDS.find(item => item.value === kind) ?? KINDS[0];
  return (
    <form className="k-panel k-fb" onSubmit={submit}>
      <fieldset className="k-fb-kinds">
        <legend>C’est plutôt…</legend>
        {KINDS.map(item => (
          <label key={item.value} className="k-fb-kind">
            <input type="radio" name="kind" value={item.value} checked={kind === item.value} onChange={() => setKind(item.value)} />
            <span><b>{item.label}</b><small>{item.hint}</small></span>
          </label>
        ))}
      </fieldset>
      <div className="k-field">
        <label htmlFor="fb-message">Ton message</label>
        <textarea id="fb-message" name="message" required minLength={3} maxLength={MAX} rows={6} value={message}
          onChange={event => setMessage(event.target.value)} placeholder={current.placeholder} aria-describedby="fb-count" />
        <small id="fb-count">{message.length} / {MAX} caractères</small>
      </div>
      <div className="k-field">
        <label htmlFor="fb-email">Ton e-mail <span className="k-req-optional">(facultatif)</span></label>
        <input id="fb-email" name="email" type="email" autoComplete="email" maxLength={320} placeholder="toi@exemple.fr" />
        <small>Seulement si tu veux une réponse. On ne l’affiche nulle part et on ne t’envoie rien d’autre.</small>
      </div>
      {turnstileSiteKey && <Turnstile ref={turnstile} siteKey={turnstileSiteKey} onToken={setToken} />}
      {error && <p className="k-req-error" role="alert">{error}</p>}
      <div className="k-req-actions">
        <button type="submit" className="k-btn k-btn-primary" disabled={state === 'sending' || message.trim().length < 3 || (Boolean(turnstileSiteKey) && !token)}>
          {state === 'sending' ? 'Envoi…' : 'Envoyer mon avis'}
        </button>
      </div>
      <p className="k-req-privacy">Un code promo à partager ? Passe plutôt par <Link href={routes.submit()}>Proposer un code</Link> : il sera vérifié et crédité à son créateur.</p>
    </form>
  );
}
