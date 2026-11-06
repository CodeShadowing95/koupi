'use client';
import { useEffect, useRef, useState } from 'react';
import Link from '@/components/site/site-pages';
import { Turnstile, type TurnstileHandle } from '@/components/turnstile';
import type { Category } from '@/lib/data';
import type { Prefill, PrefillCode } from '@/lib/submit-prefill';
import { routes } from '@/lib/routes';

// Formulaire simple pour proposer un code : un champ par information, le lien de la vidéo en premier
// pour remplir la chaîne et les codes de sa description. Mêmes données envoyées qu'avant (plusieurs
// outils par code, codes trouvés dans la vidéo), même Turnstile et même validation côté serveur.

const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';
/** Un code donné pour plusieurs outils : l'outil principal plus 4 autres au plus (voir MAX_TOOLS_PER_SUBMISSION). */
const MAX_EXTRA_TOOLS = 4;

export function SubmitForm({ categories }: { categories: Category[] }) {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [token, setToken] = useState('');
  const [code, setCode] = useState('');
  const [discount, setDiscount] = useState('');
  const [extraTools, setExtraTools] = useState<string[]>([]);
  const [tool, setTool] = useState('');
  const [creator, setCreator] = useState('');
  const [source, setSource] = useState('');
  // Le lien de la vidéo : lu par l'API YouTube pour remplir la chaîne et les codes de la description.
  const [videoUrl, setVideoUrl] = useState('');
  const [reading, setReading] = useState(false);
  const [videoNote, setVideoNote] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [foundCodes, setFoundCodes] = useState<(PrefillCode & { on: boolean })[]>([]);
  const turnstile = useRef<TurnstileHandle>(null);

  async function readVideo(url = videoUrl) {
    if (!url.trim() || reading) return;
    setReading(true);
    setVideoNote(null);
    try {
      const response = await fetch('/api/submissions/prefill', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url: url.trim() }) });
      const body = await response.json() as Prefill & { error?: string };
      if (!response.ok) { setVideoNote({ tone: 'error', text: body.error || 'La vidéo n’a pas pu être lue. Remplis le formulaire à la main.' }); return; }
      setSource(url.trim());
      if (body.creator) setCreator(body.creator);
      const [first, ...others] = body.codes;
      if (first) { setTool(first.tool); setCode(first.code); setDiscount(first.discount); setExtraTools([]); }
      setFoundCodes(others.map(item => ({ ...item, on: true })));
      setVideoNote({
        tone: 'ok',
        text: first
          ? `${body.codes.length > 1 ? `${body.codes.length} codes trouvés` : 'Un code trouvé'} dans la description. Vérifie chaque champ avant d’envoyer.`
          : 'Chaîne trouvée, mais aucun code repéré dans la description. Remplis le code à la main.',
      });
    } catch {
      setVideoNote({ tone: 'error', text: 'La vidéo n’a pas pu être lue. Vérifie ta connexion, ou remplis le formulaire à la main.' });
    } finally {
      setReading(false);
    }
  }

  // Le message de remerciement s'affiche en haut de la page.
  useEffect(() => { if (sent) window.scrollTo({ top: 0 }); }, [sent]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setError('');
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          items: [
            ...[tool, ...extraTools].map(toolName => ({ toolName, code, discountLabel: discount })),
            ...foundCodes.filter(item => item.on).map(item => ({ toolName: item.tool, code: item.code, discountLabel: item.discount })),
          ],
          creatorName: creator, sourceUrl: source, category: form.get('category'), comment: form.get('comment'), turnstileToken: token }),
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

  function again() {
    setSent(false); setSending(false); setCode(''); setDiscount(''); setExtraTools([]); setTool('');
    setFoundCodes([]); setVideoNote(null); setVideoUrl(''); setToken('');
  }

  if (sent) {
    return (
      <main className="k-page">
        <div className="k-wrap k-page-head">
          <span className="k-eyebrow">Merci</span>
          <h1>Ton code est dans la file.</h1>
          <p>On regarde la source et on le teste avant de le publier, en général sous 48 h. Le créateur sera crédité.</p>
          <div className="k-submit-done">
            <Link className="k-btn k-btn-primary" href={routes.home}>Retour à l&apos;accueil</Link>
            <button type="button" className="k-btn k-btn-ghost" onClick={again}>Proposer un autre code</button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="k-page">
      <div className="k-wrap k-split">
        <div className="k-page-head" style={{ marginBottom: 0 }}>
          <span className="k-eyebrow">Contribuer</span>
          <h1>Tu as vu passer un code&nbsp;?</h1>
          <p>Colle le lien de la vidéo : on remplit la chaîne et les codes de la description. On publie seulement les codes donnés par un créateur, avec la preuve. Pas de codes de parrainage personnels.</p>
          <div className="k-panel" style={{ marginTop: 12 }}>
            <span className="k-eyebrow">Pourquoi un lien source ?</span>
            <p>Il nous sert à créditer la bonne personne et à vérifier que le code a bien été donné en public. Sans lien, la proposition est refusée.</p>
          </div>
        </div>

        <form className="k-form" onSubmit={submit}>
          <div className="k-field">
            <label htmlFor="video">Vidéo YouTube (facultatif)</label>
            <div className="k-field-inline">
              <input id="video" type="url" maxLength={1000} placeholder="Colle le lien, on remplit le reste" value={videoUrl} autoComplete="off"
                onChange={event => setVideoUrl(event.target.value)}
                onPaste={event => { const pasted = event.clipboardData.getData('text').trim(); if (pasted) { event.preventDefault(); setVideoUrl(pasted); void readVideo(pasted); } }}
                onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); void readVideo(); } }} />
              <button type="button" className="k-btn k-btn-ghost" onClick={() => readVideo()} disabled={!videoUrl.trim() || reading}>{reading ? 'Lecture…' : 'Remplir'}</button>
            </div>
            {videoNote && <div className={`k-notice${videoNote.tone === 'error' ? ' k-notice-error' : ''}`} role="status">{videoNote.text}</div>}
          </div>

          <div className="k-field">
            <label htmlFor="tool">Outil</label>
            <input id="tool" name="tool" required maxLength={120} placeholder="Ex. Hostinger" value={tool} onChange={event => setTool(event.target.value)} autoComplete="off" />
          </div>
          {extraTools.map((item, index) => (
            <div key={index} className="k-field">
              <label htmlFor={`tool-${index}`}>Autre outil</label>
              <div className="k-field-inline">
                <input id={`tool-${index}`} required maxLength={120} placeholder="Un autre outil" value={item} autoComplete="off" autoFocus={index === extraTools.length - 1 && !item}
                  onChange={event => setExtraTools(list => list.map((other, i) => (i === index ? event.target.value : other)))} />
                <button type="button" className="k-btn k-btn-ghost" aria-label={`Retirer ${item || 'cet outil'}`} onClick={() => setExtraTools(list => list.filter((_, i) => i !== index))}>Retirer</button>
              </div>
            </div>
          ))}
          {extraTools.length < MAX_EXTRA_TOOLS && (
            <button type="button" className="k-link-btn is-strong" onClick={() => setExtraTools(list => [...list, ''])}>+ Le même code marche pour un autre outil</button>
          )}

          <div className="k-field">
            <label htmlFor="creator">Créateur</label>
            <input id="creator" name="creator" required maxLength={160} placeholder="Nom de la chaîne ou du compte" value={creator} onChange={event => setCreator(event.target.value)} autoComplete="off" />
          </div>
          <div className="k-field-row">
            <div className="k-field">
              <label htmlFor="code">Code promo</label>
              <input id="code" name="code" required maxLength={60} placeholder="Ex. MONCODE10" className="k-mono" value={code} onChange={event => setCode(event.target.value)} autoComplete="off" spellCheck={false} />
            </div>
            <div className="k-field">
              <label htmlFor="discount">Réduction annoncée (facultatif)</label>
              <input id="discount" name="discount" maxLength={60} placeholder="Ex. -10 %" value={discount} onChange={event => setDiscount(event.target.value)} autoComplete="off" />
            </div>
          </div>

          {foundCodes.length > 0 && (
            <fieldset className="k-field k-found">
              <legend>Aussi dans la vidéo</legend>
              {foundCodes.map((item, index) => (
                <label key={`${item.tool}-${item.code}`} className="k-found-row">
                  <input type="checkbox" checked={item.on} onChange={event => setFoundCodes(list => list.map((other, i) => (i === index ? { ...other, on: event.target.checked } : other)))} />
                  <b>{item.tool}</b>
                  <code className="k-mono">{item.code}</code>
                  <span>{item.discount || 'Offre du créateur'}</span>
                </label>
              ))}
            </fieldset>
          )}

          <div className="k-field">
            <label htmlFor="category">Catégorie</label>
            <select id="category" name="category" defaultValue="">
              <option value="">Je ne sais pas</option>
              {categories.map(category => <option key={category.slug} value={category.name}>{category.name}</option>)}
            </select>
          </div>
          <div className="k-field">
            <label htmlFor="source">Lien de la vidéo ou du post</label>
            <input id="source" name="source" type="url" required maxLength={1000} placeholder="https://…" value={source} onChange={event => setSource(event.target.value)} autoComplete="off" />
            <small>Idéalement avec le moment où le code est donné.</small>
          </div>
          <div className="k-field">
            <label htmlFor="comment">Commentaire (facultatif)</label>
            <textarea id="comment" name="comment" rows={3} maxLength={2000} placeholder="Une date de fin, une condition…" />
          </div>
          {turnstileSiteKey && <Turnstile ref={turnstile} siteKey={turnstileSiteKey} onToken={setToken} />}
          {error && <div className="k-notice k-notice-error" role="alert">{error}</div>}
          <button className="k-btn k-btn-primary" style={{ minHeight: 54 }} type="submit" disabled={sending || (Boolean(turnstileSiteKey) && !token)}>{sending ? 'Envoi…' : 'Envoyer pour vérification'}</button>
        </form>
      </div>
    </main>
  );
}
