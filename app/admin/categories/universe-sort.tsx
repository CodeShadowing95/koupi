'use client';
// « ✦ Ranger par univers » : l'IA lit les marques de « Outils en ligne » par lots de 60 (nom, site, catégorie) et repère
// celles qui n'en sont pas (vêtements, compléments, maison…). L'admin coche, change l'univers si besoin, puis applique :
// les marques cochées partent dans la catégorie d'accueil de leur univers, caché sur le site tant qu'il n'est pas allumé.
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { afterDialogClose } from '@/lib/admin-dialog';
import { DEFAULT_UNIVERSE } from '@/lib/universes';
import type { UniverseProposal } from '@/lib/universes-admin';

type Choice = UniverseProposal & { picked: string };

export function UniverseSort({ universes, onClose }: { universes: { slug: string; name: string }[]; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const stop = useRef(false);
  const changed = useRef(false);
  const [choices, setChoices] = useState<Choice[]>([]);
  const [progress, setProgress] = useState<{ read: number; total: number } | null>(null);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [result, setResult] = useState('');
  const nameOf = (slug: string) => universes.find(item => item.slug === slug)?.name ?? slug;

  useEffect(() => { if (!dialog.current?.open) dialog.current?.showModal(); }, []);

  async function start() {
    setRunning(true);
    setNotice('');
    setResult('');
    setChoices([]);
    setFinished(false);
    stop.current = false;
    let offset: number | null = 0;
    let read = 0;
    while (offset !== null && !stop.current) {
      try {
        const response = await fetch('/api/admin/universes/sort', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ offset }) });
        const body = await response.json().catch(() => ({})) as { proposals?: UniverseProposal[]; read?: number; total?: number; next?: number | null; error?: string };
        if (!response.ok || !body.proposals) { setNotice(body.error || 'La lecture par l’IA a échoué.'); break; }
        read += body.read ?? 0;
        setProgress({ read, total: body.total ?? read });
        setChoices(current => [...current, ...body.proposals!.map(item => ({ ...item, picked: item.universe }))]);
        offset = body.next ?? null;
        if (offset === null) setFinished(true);
      } catch {
        setNotice('La lecture a échoué. Vérifie ta connexion.');
        break;
      }
    }
    setRunning(false);
  }

  const moves = choices.filter(choice => choice.picked !== DEFAULT_UNIVERSE);

  async function apply() {
    setSaving(true);
    setNotice('');
    try {
      const response = await fetch('/api/admin/universes/move', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ moves: moves.map(choice => ({ toolId: choice.toolId, universe: choice.picked })) }) });
      const body = await response.json().catch(() => ({})) as { moved?: number; error?: string };
      if (!response.ok) setNotice(body.error || 'Le rangement n’a pas pu être enregistré.');
      else {
        changed.current = true;
        setResult(`${body.moved ?? 0} marque${(body.moved ?? 0) > 1 ? 's rangées' : ' rangée'} dans leur univers. Elles ne sont plus visibles sur le site tant que leur univers reste éteint.`);
        setChoices([]);
      }
    } catch {
      setNotice('Le rangement a échoué. Vérifie ta connexion.');
    }
    setSaving(false);
  }

  const groups = universes.filter(universe => universe.slug !== DEFAULT_UNIVERSE)
    .map(universe => ({ universe, items: choices.filter(choice => choice.universe === universe.slug) }))
    .filter(group => group.items.length > 0);

  return (
    <dialog ref={dialog} className="adm-dialog adm-drawer" aria-labelledby="universe-sort-title"
      onClose={() => afterDialogClose(() => { stop.current = true; if (changed.current) router.refresh(); onClose(); })}>
      <div className="adm-form">
        <div className="adm-dialog-head">
          <h2 id="universe-sort-title">Ranger par univers</h2>
          <button type="button" className="adm-icon-btn" aria-label="Fermer" onClick={() => dialog.current?.close()}>✕</button>
        </div>
        <p className="adm-dialog-intro">
          L’IA lit le nom, le site et la catégorie de chaque marque des outils en ligne, par lots de 60, et repère celles qui vendent autre chose
          (vêtements, cosmétiques, maison…). Rien ne bouge sans ton accord : change l’univers d’une ligne ou choisis « Garder dans Outils en ligne », puis range. Quelques centimes, comptés dans le plafond du mois.
        </p>
        {notice && <div className="notice notice-error" role="alert">{notice}</div>}
        {result && <div className="notice" role="status">{result}</div>}
        {progress && <p className="adm-tidy-count" role="status">{progress.read} sur {progress.total} marques lues{running ? '…' : ''} · {choices.length} à ranger ailleurs</p>}
        {groups.map(group => (
          <section key={group.universe.slug} className="adm-usort-group" aria-label={group.universe.name}>
            <h3>{group.universe.name} <span className="muted">· {group.items.length}</span></h3>
            <ul className="adm-tidy-list">
              {group.items.map(choice => (
                <li key={choice.toolId} className="adm-tidy-row">
                  <div className="adm-tidy-main">
                    <b>{choice.name}</b>
                    <span className="adm-tidy-site">{choice.category}{choice.reason ? ` · ${choice.reason}` : ''}</span>
                  </div>
                  <div className="adm-tidy-verdict">
                    <label htmlFor={`usort-${choice.toolId}`} className="sr-only">Univers de {choice.name}</label>
                    <select id={`usort-${choice.toolId}`} className="adm-inline-select" value={choice.picked} disabled={saving}
                      onChange={event => setChoices(current => current.map(item => item.toolId === choice.toolId ? { ...item, picked: event.target.value } : item))}>
                      {universes.map(universe => <option key={universe.slug} value={universe.slug}>{universe.slug === DEFAULT_UNIVERSE ? 'Garder dans Outils en ligne' : universe.name}</option>)}
                    </select>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {finished && choices.length === 0 && !result && <p className="muted">Aucune marque à ranger ailleurs : tout ressemble à des outils en ligne.</p>}
        <div className="adm-dialog-foot">
          <span style={{ flex: 1 }} />
          <button type="button" className="adm-btn" onClick={() => dialog.current?.close()}>Fermer</button>
          {running
            ? <button type="button" className="adm-btn adm-btn-pri" onClick={() => { stop.current = true; }}>Arrêter</button>
            : choices.length > 0
              ? <button type="button" className="adm-btn adm-btn-pri" disabled={saving || moves.length === 0} onClick={apply}>{saving ? 'Rangement…' : `Ranger ${moves.length} marque${moves.length > 1 ? 's' : ''}`}</button>
              : <button type="button" className="adm-btn adm-btn-pri" onClick={start}>{progress ? '✦ Relancer la lecture' : '✦ Lancer la lecture'}</button>}
        </div>
      </div>
    </dialog>
  );
}
