'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from '@/components/site/site-pages';
import { Turnstile, type TurnstileHandle } from '@/components/turnstile';
import type { Category } from '@/lib/data';
import { routes } from '@/lib/routes';
import { barcodeBars, couponNumber } from '@/lib/coupon-barcode';
import { playCouponTear } from '@/lib/coupon-sound';

// Le formulaire est un bon de réduction : les champs sont les lignes pointillées à remplir,
// la réduction s'écrit dans une pastille « promo » comme sur les coupons de supermarché,
// et le talon perforé à droite est le bouton d'envoi. Son code-barres et le numéro du bon
// se dessinent à partir du code tapé. À l'envoi réussi, le talon se détache (son de déchirure),
// puis le bon tamponné « En vérification » s'affiche. Sans animation si on les a réduites.

const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';
const TEAR_MS = 950;

const Scissors = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M20 4 8.12 15.88M14.47 14.48 20 20M8.12 8.12 12 12" /></svg>
);

function Barcode({ code }: { code: string }) {
  const { bars, width } = useMemo(() => barcodeBars(code), [code]);
  return (
    <svg className="k-bon-barcode" viewBox={`0 0 ${width} 40`} preserveAspectRatio="none" aria-hidden="true">
      {bars.map(bar => <rect key={bar.x} x={bar.x} y="0" width={bar.width} height="40" />)}
    </svg>
  );
}

export function SubmitForm({ categories }: { categories: Category[] }) {
  const [phase, setPhase] = useState<'form' | 'tearing' | 'sent'>('form');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [token, setToken] = useState('');
  const [code, setCode] = useState('');
  const [discount, setDiscount] = useState('');
  const turnstile = useRef<TurnstileHandle>(null);
  const number = couponNumber(code);

  // Le bon tamponné s'affiche en haut de la page.
  useEffect(() => { if (phase === 'sent') window.scrollTo({ top: 0 }); }, [phase]);

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
      // Le talon se détache, puis on montre le bon tamponné.
      playCouponTear();
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      setPhase(reduced ? 'sent' : 'tearing');
      if (!reduced) window.setTimeout(() => setPhase('sent'), TEAR_MS);
    } catch {
      setError('La proposition n’a pas pu être envoyée. Vérifie ta connexion et réessaie.');
      setSending(false);
      turnstile.current?.reset();
    }
  }

  if (phase === 'sent') {
    return (
      <main className="k-page">
        <div className="k-wrap k-bon-wrap">
          <div className="k-bon k-bon-done">
            <div className="k-bon-main k-paper">
              <p className="k-bon-top"><span>Bon de proposition</span><span>N° K-{number}</span></p>
              <h1 className="k-bon-title">Ton code est dans la file.</h1>
              <p className="k-bon-lead">On regarde la source et on le teste avant de le publier, en général sous 48 h. Le créateur sera crédité.</p>
              <span className="k-bon-stamp" aria-hidden="true"><span>En vérification</span></span>
              <div className="k-bon-actions">
                <Link className="k-btn k-btn-primary" href={routes.home}>Retour à l&apos;accueil</Link>
                <button type="button" className="k-btn k-btn-ghost k-bon-again" onClick={() => { setPhase('form'); setSending(false); setCode(''); setDiscount(''); setToken(''); }}>Proposer un autre code</button>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="k-page">
      <div className="k-wrap k-bon-wrap">
        <div className="k-page-head k-bon-head">
          <span className="k-eyebrow">Contribuer</span>
          <h1>Tu as vu passer un code&nbsp;?</h1>
          <p>Remplis le bon, détache le talon : on vérifie la source, on teste le code et on crédite le créateur.</p>
        </div>

        <p className="k-bon-cut" aria-hidden="true"><Scissors /> Découper suivant les pointillés</p>

        <form className={`k-bon${phase === 'tearing' ? ' is-tearing' : ''}`} onSubmit={submit}>
          <div className="k-bon-main k-paper">
            <p className="k-bon-top"><span>Bon de proposition</span><span>N° K-{number}</span></p>

            <div className="k-bon-hero">
              <div className="k-bon-hero-lines">
                <label className="k-bon-line is-big">
                  <span className="k-bon-key">Outil</span>
                  <input name="tool" required maxLength={120} placeholder="Hostinger, NordVPN…" autoComplete="off" />
                </label>
                <label className="k-bon-line">
                  <span className="k-bon-key">Donné par</span>
                  <input name="creator" required maxLength={160} placeholder="Nom de la chaîne ou du compte" autoComplete="off" />
                </label>
              </div>
              <label className={`k-bon-burst${discount ? ' is-filled' : ''}`}>
                <span className="k-bon-burst-label">Réduction</span>
                <input name="discount" required maxLength={60} placeholder="−10 %" value={discount} style={{ fontSize: discount.length > 14 ? 15 : discount.length > 8 ? 19 : 26 }} onChange={event => setDiscount(event.target.value)} autoComplete="off" />
                <span className="k-bon-burst-sub">annoncée</span>
              </label>
            </div>

            <label className="k-bon-codebox">
              <span className="k-bon-key">Code promo</span>
              <input name="code" required maxLength={60} placeholder="MONCODE10" className="k-mono" value={code} onChange={event => setCode(event.target.value)} autoComplete="off" spellCheck={false} />
            </label>

            <div className="k-bon-grid">
              <label className="k-bon-line">
                <span className="k-bon-key">Catégorie</span>
                <select name="category" defaultValue="">
                  <option value="">Je ne sais pas</option>
                  {categories.map(category => <option key={category.slug} value={category.name}>{category.name}</option>)}
                </select>
              </label>
              <label className="k-bon-line">
                <span className="k-bon-key">Source*</span>
                <input name="source" type="url" required maxLength={1000} placeholder="https://youtube.com/watch?v=…" autoComplete="off" />
              </label>
            </div>

            <label className="k-bon-note">
              <span className="k-bon-key">Note pour l&apos;équipe <small>(facultatif)</small></span>
              <textarea name="comment" rows={2} maxLength={2000} placeholder="Le moment de la vidéo où le code est donné, une date de fin…" />
            </label>

            <div className="k-bon-small">
              <p>* Le lien de la vidéo ou du post sert à créditer la bonne personne et à vérifier que le code a été donné en public. Sans lien, la proposition est refusée. Pas de codes de parrainage personnels. Offre non cumulable avec la mauvaise foi.</p>
              {turnstileSiteKey && <div className="k-bon-captcha"><Turnstile ref={turnstile} siteKey={turnstileSiteKey} onToken={setToken} /></div>}
            </div>
            {error && <div className="k-notice k-notice-error" role="alert">{error}</div>}
          </div>

          <button className="k-bon-stub" type="submit" disabled={sending || (Boolean(turnstileSiteKey) && !token)}>
            <span className="k-bon-stub-tag">Talon à détacher</span>
            <span className="k-bon-stub-cta">{sending ? 'Envoi…' : <>Envoyer<br />pour vérification</>}</span>
            <svg className="k-bon-stub-arrow" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            <span className="k-bon-stub-bar"><Barcode code={code} /><span className="k-mono">{code.trim().toUpperCase() || 'K-' + number}</span></span>
          </button>
        </form>
      </div>
    </main>
  );
}
