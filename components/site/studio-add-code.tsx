'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

// « Ajouter une offre » dans le Studio : un code, un lien d'affiliation, ou les deux. Créateur prouvé : en ligne tout de suite. Sinon : relu par Merkod d'abord.
export function StudioAddCode({ tools, proven }: { tools: { slug: string; name: string }[]; proven: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

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
      setDone(result.status === 'to_test' ? 'Ton offre est en ligne.' : 'Ton offre est envoyée : Merkod la relit avant de la publier.');
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
      <p className="k-st-muted">{proven ? 'Ta chaîne est prouvée : ton offre est publiée tout de suite, marquée « À tester ».' : 'Ta page n’est pas encore vérifiée : Merkod relit ton offre avant de la publier.'}</p>
      <div className="k-st-add-grid">
        <label>Outil
          <select name="toolSlug" required defaultValue="">
            <option value="" disabled>Choisis l’outil</option>
            {tools.map(tool => <option key={tool.slug} value={tool.slug}>{tool.name}</option>)}
          </select>
        </label>
        <label>Ton code promo <small>(si tu en as un)</small><input name="code" maxLength={120} placeholder="VASTO20" autoCapitalize="characters" /></label>
        <label>Ce que gagne la personne<input name="discount" maxLength={240} required placeholder="-20 % sur l’abonnement" /></label>
        <label>Ton lien d’affiliation <small>(si tu en as un)</small><input name="creatorLink" type="url" inputMode="url" maxLength={1000} placeholder="https://…" /></label>
        <label>Vidéo ou post où tu le donnes <small>(facultatif)</small><input name="sourceUrl" type="url" inputMode="url" maxLength={1000} placeholder="https://youtu.be/…" /></label>
        <label>Date de fin <small>(facultatif)</small><input name="expiresOn" type="date" /></label>
      </div>
      {error && <p className="k-req-error" role="alert">{error}</p>}
      <div className="k-st-row">
        <button type="submit" className="k-btn k-btn-primary" disabled={busy}>{busy ? 'Envoi…' : proven ? 'Publier mon offre' : 'Envoyer mon offre'}</button>
        <button type="button" className="k-btn k-btn-ghost" onClick={() => setOpen(false)}>Annuler</button>
      </div>
      <p className="k-st-muted">Remplis ton code, ton lien d’affiliation, ou les deux : avec les deux, le visiteur copie ton code puis arrive sur l’outil par ton lien. Plusieurs liens pour un même outil (mensuel, annuel…) ? Ajoute une offre par lien. Ton outil n’est pas dans la liste ? Écris-nous depuis la page Ton avis.</p>
    </form>
  );
}
