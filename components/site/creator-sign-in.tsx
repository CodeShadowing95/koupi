'use client';
import { useEffect, useRef, useState } from 'react';
import { Turnstile, type TurnstileHandle } from '@/components/turnstile';

// Formulaire de connexion des créateurs : un seul champ, l'e-mail. Après l'envoi, pas d'écran vide :
// on montre ce qui l'attend et on garde un bouton pour renvoyer le lien.

const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';
const RESEND_SECONDS = 30;

export function CreatorSignIn({ slug, name }: { slug: string | null; name: string | null }) {
  const turnstile = useRef<TurnstileHandle>(null);
  const input = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [state, setState] = useState<'form' | 'sent' | 'noted'>('form');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (wait <= 0) return;
    const timer = setTimeout(() => setWait(wait - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  async function send() {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/creator-auth/request', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, slug, turnstileToken: token }),
      });
      const body = await response.json().catch(() => ({})) as { error?: string; sent?: boolean };
      turnstile.current?.reset();
      setToken('');
      if (!response.ok) { setError(body.error || 'Le lien n’a pas pu être envoyé.'); return; }
      setState(body.sent === false ? 'noted' : 'sent');
      setWait(RESEND_SECONDS);
    } catch {
      setError('Le lien n’a pas pu être envoyé. Vérifie ta connexion et réessaie.');
    } finally {
      setBusy(false);
    }
  }

  const needsToken = Boolean(turnstileSiteKey) && !token;

  if (state === 'sent' || state === 'noted') {
    return (
      <div className="k-fc-done" role="status">
        <span className="k-fc-done-icon" aria-hidden="true">✉</span>
        {state === 'sent' ? (
          <>
            <h2>Ton lien est parti.</h2>
            <p>Ouvre l’e-mail envoyé à <b>{email}</b> et clique sur « Entrer dans mon espace ». Le lien marche 20 minutes.</p>
          </>
        ) : (
          <>
            <h2>C’est noté{name ? `, ${name}` : ''}.</h2>
            <p>La connexion ouvre très bientôt. On t’écrit à <b>{email}</b> dès que ton espace est prêt, avec ton lien d’accès.</p>
          </>
        )}
        <ul className="k-fc-next" aria-label="Ce qui t’attend">
          <li><b>Tes copies, code par code</b><span>Combien de fois chacun a été copié ce mois-ci.</span></li>
          <li><b>Ta page vérifiée</b><span>Un lien à mettre dans tes descriptions, avec tous tes codes au même endroit.</span></li>
          <li><b>Tes codes à jour</b><span>Bientôt : une alerte quand un code ne marche plus.</span></li>
        </ul>
        {state === 'sent' && (
          <div className="k-fc-resend">
            {turnstileSiteKey && wait === 0 && <Turnstile ref={turnstile} siteKey={turnstileSiteKey} onToken={setToken} />}
            <button type="button" className="k-btn k-btn-ghost" disabled={busy || wait > 0 || needsToken} onClick={send}>
              {wait > 0 ? `Renvoyer le lien (${wait} s)` : 'Renvoyer le lien'}
            </button>
            <button type="button" className="k-link-btn" onClick={() => { setState('form'); setError(''); setTimeout(() => input.current?.focus(), 0); }}>Changer d’adresse</button>
          </div>
        )}
        {error && <p className="k-req-error" role="alert">{error}</p>}
      </div>
    );
  }

  return (
    <form className="k-fc-form" onSubmit={event => { event.preventDefault(); void send(); }}>
      <div className="k-field">
        <label htmlFor="fc-email">Ton e-mail</label>
        <div className="k-fc-inline">
          <input ref={input} id="fc-email" name="email" type="email" autoComplete="email" inputMode="email" required maxLength={320}
            placeholder="toi@exemple.fr" value={email} onChange={event => setEmail(event.target.value)} />
          <button type="submit" className="k-btn k-btn-primary" disabled={busy || needsToken}>{busy ? 'Envoi…' : 'Recevoir mon lien'}</button>
        </div>
      </div>
      <p className="k-fc-reassure">Gratuit. Pas de mot de passe : un lien par e-mail, et tu es dedans.</p>
      {turnstileSiteKey && <Turnstile ref={turnstile} siteKey={turnstileSiteKey} onToken={setToken} />}
      {error && <p className="k-req-error" role="alert">{error}</p>}
    </form>
  );
}
