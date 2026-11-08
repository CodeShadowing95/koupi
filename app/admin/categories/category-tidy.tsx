'use client';
// « Ranger la catégorie » : l'IA relit le site de chaque outil d'une catégorie, un par un, et dit s'il irait mieux
// ailleurs. L'admin accepte ou garde ligne par ligne ; rien ne bouge sans son clic. S'arrête au plafond de l'IA.
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { afterDialogClose } from '@/lib/admin-dialog';
import type { ToolAnalysis } from '@/lib/tool-analysis';
import { tidyCostCents, tidyVerdict, type TidyVerdict } from '@/lib/category-tidy';

export type TidyTool = { id: string; name: string; website: string; description: string | null; priority: number; categorySlug: string };

type Row =
  | { state: 'waiting' }
  | { state: 'reading' }
  | { state: 'error'; error: string }
  | { state: 'done'; verdict: TidyVerdict; summary: string; decision?: 'saving' | 'applied' | 'kept'; error?: string };

const formatCents = (cents: number) => `${cents.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} centime${cents >= 2 ? 's' : ''}`;

export function CategoryTidy({ category, tools, categories, onClose }: {
  category: { slug: string; name: string };
  tools: TidyTool[];
  categories: { slug: string; name: string }[];
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [running, setRunning] = useState(false);
  const [notice, setNotice] = useState('');
  const stop = useRef(false);
  const changed = useRef(false);
  const created = useRef(new Map<string, string>());
  const nameOf = (slug: string) => categories.find(item => item.slug === slug)?.name ?? slug;
  const setRow = (id: string, row: Row) => setRows(current => ({ ...current, [id]: row }));

  useEffect(() => { if (!dialog.current?.open) dialog.current?.showModal(); }, []);

  async function start() {
    setRunning(true);
    setNotice('');
    stop.current = false;
    for (const tool of tools) {
      if (stop.current) break;
      if (rows[tool.id]?.state === 'done') continue;
      setRow(tool.id, { state: 'reading' });
      try {
        const response = await fetch('/api/admin/tools/category', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: tool.name, website: tool.website }) });
        const body = await response.json().catch(() => ({})) as { analysis?: ToolAnalysis; error?: string };
        if (!response.ok || !body.analysis) {
          const error = body.error || 'Analyse impossible pour le moment.';
          setRow(tool.id, { state: 'error', error });
          // Plafond atteint ou IA coupée : inutile de continuer, les lectures suivantes échoueraient aussi.
          if (/plafond|pas encore activée/i.test(error)) { setNotice(error); break; }
        } else {
          setRow(tool.id, { state: 'done', verdict: tidyVerdict(category.slug, body.analysis, categories), summary: body.analysis.summary });
        }
      } catch {
        setRow(tool.id, { state: 'error', error: 'Analyse impossible. Vérifie ta connexion.' });
      }
    }
    setRunning(false);
  }

  async function apply(tool: TidyTool, row: Extract<Row, { state: 'done' }>) {
    const { verdict } = row;
    if (verdict.kind !== 'move' && verdict.kind !== 'create') return;
    setRow(tool.id, { ...row, decision: 'saving', error: undefined });
    try {
      let slug = verdict.kind === 'move' ? verdict.slug : created.current.get(verdict.name);
      if (!slug) {
        const response = await fetch('/api/admin/categories', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: (verdict as { name: string }).name }) });
        const body = await response.json().catch(() => ({})) as { slug?: string; error?: string };
        if (!response.ok || !body.slug) { setRow(tool.id, { ...row, decision: undefined, error: body.error || 'La catégorie n’a pas pu être créée.' }); return; }
        slug = body.slug;
        created.current.set((verdict as { name: string }).name, slug);
      }
      const response = await fetch(`/api/admin/tools/${tool.id}`, {
        method: 'PATCH', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: tool.name, categorySlug: slug, website: tool.website, description: tool.description ?? '', priority: tool.priority }),
      });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) { setRow(tool.id, { ...row, decision: undefined, error: body.error || 'Le déplacement a échoué.' }); return; }
      changed.current = true;
      setRow(tool.id, { ...row, decision: 'applied' });
    } catch {
      setRow(tool.id, { ...row, decision: undefined, error: 'Le déplacement a échoué. Vérifie ta connexion.' });
    }
  }

  const done = Object.values(rows).filter(row => row.state === 'done');
  const proposals = done.filter(row => row.state === 'done' && (row.verdict.kind === 'move' || row.verdict.kind === 'create')).length;
  const started = Object.keys(rows).length > 0;

  const verdictText = (row: Extract<Row, { state: 'done' }>) => {
    const { verdict } = row;
    if (verdict.kind === 'stay') return <span className="adm-tidy-ok">À sa place</span>;
    if (verdict.kind === 'unsure') return <span className="muted">L’IA ne tranche pas : il reste ici.</span>;
    const target = verdict.kind === 'move' ? <>Irait mieux dans <b>{nameOf(verdict.slug)}</b></> : <>Nouvelle catégorie proposée : <b>{verdict.name}</b></>;
    return <span>{target}{verdict.reason ? <span className="muted"> · {verdict.reason}</span> : null}</span>;
  };

  return (
    <dialog ref={dialog} className="adm-dialog adm-drawer" aria-labelledby="tidy-title"
      onClose={() => afterDialogClose(() => { stop.current = true; if (changed.current) router.refresh(); onClose(); })}>
      <div className="adm-form">
        <div className="adm-dialog-head">
          <h2 id="tidy-title">Ranger « {category.name} »</h2>
          <button type="button" className="adm-icon-btn" aria-label="Fermer" onClick={() => dialog.current?.close()}>✕</button>
        </div>
        <p className="adm-dialog-intro">
          L’IA relit le site officiel de chacun des {tools.length} outils et dit s’il irait mieux dans une autre catégorie.
          Rien ne bouge sans ton clic. Coût estimé : environ {formatCents(tidyCostCents(tools.length))}, compté dans le plafond du mois.
        </p>
        {notice && <div className="notice notice-error" role="alert">{notice} La relecture s’est arrêtée.</div>}
        {started && <p className="adm-tidy-count" role="status">{done.length} sur {tools.length} relus · {proposals} proposition{proposals > 1 ? 's' : ''} de déplacement</p>}
        <ul className="adm-tidy-list">
          {tools.map(tool => {
            const row = rows[tool.id] ?? { state: 'waiting' };
            return (
              <li key={tool.id} className="adm-tidy-row" data-state={row.state}>
                <div className="adm-tidy-main">
                  <b>{tool.name}</b>
                  <span className="adm-tidy-site">{tool.website}</span>
                </div>
                <div className="adm-tidy-verdict">
                  {row.state === 'waiting' && <span className="muted">{started ? 'En attente' : '—'}</span>}
                  {row.state === 'reading' && <span className="muted">Lecture du site…</span>}
                  {row.state === 'error' && <span className="adm-tidy-error">{row.error}</span>}
                  {row.state === 'done' && <>
                    {verdictText(row)}
                    {row.error && <span className="adm-tidy-error">{row.error}</span>}
                    {(row.verdict.kind === 'move' || row.verdict.kind === 'create') && (
                      row.decision === 'applied' ? <span className="adm-tidy-ok">Déplacé ✓</span>
                        : row.decision === 'kept' ? <span className="muted">Gardé ici</span>
                          : <span className="adm-tidy-actions">
                            <button type="button" className="adm-btn adm-btn-pri" disabled={row.decision === 'saving'} onClick={() => apply(tool, row)}>
                              {row.decision === 'saving' ? 'Déplacement…' : row.verdict.kind === 'create' ? 'Créer et déplacer' : 'Déplacer'}
                            </button>
                            <button type="button" className="adm-btn" disabled={row.decision === 'saving'} onClick={() => setRow(tool.id, { ...row, decision: 'kept' })}>Garder ici</button>
                          </span>
                    )}
                  </>}
                </div>
              </li>
            );
          })}
        </ul>
        <div className="adm-dialog-foot">
          <span style={{ flex: 1 }} />
          <button type="button" className="adm-btn" onClick={() => dialog.current?.close()}>Fermer</button>
          {running
            ? <button type="button" className="adm-btn adm-btn-pri" onClick={() => { stop.current = true; }}>Arrêter</button>
            : <button type="button" className="adm-btn adm-btn-pri" disabled={done.length === tools.length} onClick={start}>{started ? 'Reprendre la relecture' : '✦ Lancer la relecture'}</button>}
        </div>
      </div>
    </dialog>
  );
}
