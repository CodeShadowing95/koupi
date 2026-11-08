'use client';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { StudioToolField, type ToolChoice } from './studio-tool-field';

const OFFER_HELP = 'Remplis ton code, ton lien d’affiliation, ou les deux : avec les deux, le visiteur copie ton code puis arrive sur l’outil par ton lien. Plusieurs liens pour un même outil (mensuel, annuel…) ? Ajoute une offre par lien.';

/** Petit « i » au bout du libellé : l'aide s'affiche au survol ou au focus, sans pousser le formulaire. */
function InfoHint({ text }: { text: string }) {
  return (
    <button type="button" className="k-st-info" aria-label={text} onClick={event => event.preventDefault()}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9.5" /><path d="M12 11v6M12 7.5v.01" /></svg>
      <span className="k-st-info-tip" aria-hidden="true">{text}</span>
    </button>
  );
}

// « Ajouter une offre » dans le Studio : un code, un lien d'affiliation, ou les deux. Créateur prouvé : en ligne tout de suite. Sinon : relu par Merkod d'abord.
export function StudioAddCode({ tools, proven }: { tools: ToolChoice[]; proven: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const [newTool, setNewTool] = useState(false);
  const onNewTool = useCallback((value: boolean) => setNewTool(value), []);

  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    setBusy(true);
    setError('');
    setDone('');
    try {
      const response = await fetch('/api/creator-codes', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) { setError(typeof result.error === 'string' ? result.error : 'Impossible d’ajouter cette offre.'); return; }
      form.reset();
      setOpen(false);
      setDone(result.status === 'to_test' ? 'Ton offre est en ligne.' : result.status === 'new_tool' ? 'Ton offre est envoyée : Merkod ajoute l’outil, puis la relit avant de la publier.' : 'Ton offre est envoyée : Merkod la relit avant de la publier.');
      router.refresh();
    } catch {
      setError('Pas de connexion. Réessaie dans un instant.');
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <div className="k-st-add-head">
        <button type="button" className="k-btn k-btn-primary" onClick={() => setOpen(true)}>Ajouter une offre</button>
        {done && <p className="k-st-muted" role="status">{done}</p>}
      </div>
    );
  }
  return (
    <form className="k-st-card k-st-add" onSubmit={send}>
      <p className="k-st-muted">{proven ? 'Ta chaîne est prouvée : ton offre est publiée tout de suite, marquée « À tester » (sauf pour un outil pas encore sur Merkod, qu’on ajoute d’abord).' : 'Ta page n’est pas encore vérifiée : Merkod relit ton offre avant de la publier.'}</p>
      <div className="k-st-add-grid">
        <StudioToolField tools={tools} onNewTool={onNewTool} />
        <label>Ton code promo <small>(si tu en as un)</small><InfoHint text={OFFER_HELP} /><input name="code" maxLength={120} placeholder="VASTO20" autoCapitalize="characters" /></label>
        <label>Ce que gagne la personne<input name="discount" maxLength={240} required placeholder="-20 % sur l’abonnement" /></label>
        <label>Ton lien d’affiliation <small>(si tu en as un)</small><InfoHint text={OFFER_HELP} /><input name="creatorLink" type="url" inputMode="url" maxLength={1000} placeholder="https://…" /></label>
        <label>Vidéo ou post où tu le donnes <small>(facultatif)</small><input name="sourceUrl" type="url" inputMode="url" maxLength={1000} placeholder="https://youtu.be/…" /></label>
        <label>Date de fin <small>(facultatif)</small><input name="expiresOn" type="date" /></label>
        {newTool && <label>Site de l’outil <small>(facultatif, ça nous aide à l’ajouter)</small><input name="toolSite" inputMode="url" maxLength={300} placeholder="notion.so" /></label>}
      </div>
      {newTool && <p className="k-st-muted" role="status">Cet outil n’est pas encore sur Merkod : on l’ajoute, puis on relit ton offre.</p>}
      {error && <p className="k-req-error" role="alert">{error}</p>}
      <div className="k-st-row">
        <button type="submit" className="k-btn k-btn-primary" disabled={busy}>{busy ? 'Envoi…' : proven ? 'Publier mon offre' : 'Envoyer mon offre'}</button>
        <button type="button" className="k-btn k-btn-ghost" onClick={() => setOpen(false)}>Annuler</button>
      </div>
    </form>
  );
}
