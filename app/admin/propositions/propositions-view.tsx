'use client';
import { useEffect, useState } from 'react';
import type { Category } from '@/lib/data';
import type { ToolOption } from '@/lib/codes-admin';
import type { ExistingCode } from '@/lib/code-format';
import { CodeEditor, type EditorTarget } from '@/components/admin-code-editor';
import { matchesSearch } from '@/lib/admin-search';
import { SUBMISSIONS_CHANGED } from '../pending-count';
import { ViewToggle, useAdminView } from '@/components/admin-view-toggle';
import { Pagination, usePagination } from '@/components/admin-pagination';
import { AdminSelect } from '@/components/admin-select';
import { LetterBar, SortControl, SortHeader, useAdminSort, type SortField } from '@/components/admin-sort';
import { CopyCode, IconLink, StatusDot, type Tone } from '@/components/admin-card';
import { ExportMenu } from '@/components/admin-export-menu';
import { AdminDrawer, DetailList, openOnClick } from '@/components/admin-drawer';
import { RefreshButton } from '@/components/admin-refresh-button';
import { parisDate } from '@/lib/paris-date';
type Submission = { id: string; tool_name: string; creator_name: string; code: string; discount_label: string; source_url: string; creator_link: string | null; comment: string | null; submitter_email: string | null; status: string; admin_note: string | null; created_at: string; category: string | null; created_code_id: string | null };
const sortFields: SortField<Submission>[] = [
  { key: 'received', label: 'Date de réception', value: item => item.created_at },
  { key: 'code', label: 'Code', value: item => item.code, text: true },
  { key: 'tool', label: 'Outil', value: item => item.tool_name, text: true },
  { key: 'creator', label: 'Créateur', value: item => item.creator_name, text: true },
];
export function PropositionsView({ categories, tools, creators, existing }: { categories: Category[]; tools: ToolOption[]; creators: string[]; existing: ExistingCode[] }) {
  const [editing, setEditing] = useState<EditorTarget | null>(null);
  const [items, setItems] = useState<Submission[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = items.find(item => item.id === selectedId) ?? null;
  const [status, setStatus] = useState('new');
  const [category, setCategory] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [view, setView] = useAdminView();
  async function load(nextStatus = status, nextCategory = category, nextFrom = from, nextTo = to) {
    setLoading(true); setError('');
    const params = new URLSearchParams({ status: nextStatus });
    if (nextCategory) params.set('category', nextCategory);
    if (nextFrom) params.set('from', nextFrom);
    if (nextTo) params.set('to', nextTo);
    const response = await fetch(`/api/admin/submissions?${params.toString()}`);
    const body = await response.json() as { submissions?: Submission[]; counts?: Record<string, number>; error?: string };
    if (!response.ok) { setError(body.error || 'Impossible de charger la file.'); setLoading(false); return; }
    setItems(body.submissions || []); setCounts(body.counts ?? null); setLoading(false);
  }
  useEffect(() => { void load(); }, [status, category, from, to]);
  // La recherche globale ouvre la liste déjà filtrée (?q=CODE).
  useEffect(() => { const q = new URLSearchParams(window.location.search).get('q'); if (q) setQuery(q); }, []);
  async function decide(id: string, action: string) {
    const note = action === 'reject' ? window.prompt('Note de refus (facultative)') || '' : '';
    const response = await fetch('/api/admin/submissions', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, action, note }) });
    if (!response.ok) { setError('La décision n’a pas pu être enregistrée.'); return; }
    await load();
    window.dispatchEvent(new Event(SUBMISSIONS_CHANGED));
  }
  function resetFilters() { setCategory(''); setFrom(''); setTo(''); }
  const statusPill: Record<string, string> = { new: 'adm-pill', duplicate: 'adm-pill adm-pill-warn', approved: 'adm-pill adm-pill-ok', rejected: 'adm-pill adm-pill-bad' };
  const statusTone: Record<string, Tone> = { new: 'info', duplicate: 'warn', approved: 'ok', rejected: 'bad' };
  const statusName: Record<string, string> = { new: 'À traiter', duplicate: 'Doublon', approved: 'Validée', rejected: 'Refusée' };
  function decisionButtons(item: Submission) {
    return item.status === 'new' ? <>
      <button type="button" className="adm-btn adm-btn-pri" onClick={() => setEditing({ kind: 'submission', submission: item })}>Valider…</button>
      <button type="button" className="adm-btn" onClick={() => decide(item.id, 'mark_duplicate')}>Doublon</button>
      <button type="button" className="adm-btn" onClick={() => decide(item.id, 'reject')}>Refuser</button>
    </> : item.created_code_id ? <a className="adm-btn" href={`/admin/codes?q=${encodeURIComponent(item.code)}`}>Voir le code</a>
      : <button type="button" className="adm-btn" onClick={() => decide(item.id, 'restore')}>Remettre à traiter</button>;
  }
  const filtered = items.filter(item => matchesSearch([item.code, item.tool_name, item.creator_name, item.discount_label, item.comment, item.submitter_email], query));
  const sort = useAdminSort(filtered, sortFields, 'tool');
  const visible = sort.items;
  const { current, goTo, topRef, size, changeSize } = usePagination(visible, `${status}|${category}|${from}|${to}|${query}|${sort.resetKey}`);
  return (
    <main className="adm-page">
      <div className="container">
        <div className="adm-head">
          <div>
            <span className="eyebrow">Modération</span>
            <h1>Propositions</h1>
            <p>Vérifie la source et décide ce qui peut entrer dans le catalogue public.</p>
          </div>
          <div className="adm-head-actions"><RefreshButton onRefresh={() => load()} /><ExportMenu type="propositions" /></div>
        </div>
        <div className="adm-toolbar">
          <div className="adm-filters">
            {['new', 'duplicate', 'approved', 'rejected', 'all'].map(option => <button key={option} type="button" className="adm-filter" aria-pressed={status === option} onClick={() => setStatus(option)}>{option === 'new' ? 'À traiter' : option === 'duplicate' ? 'Doublons' : option === 'approved' ? 'Validées' : option === 'rejected' ? 'Refusées' : 'Toutes'}{counts && <span className="adm-tab-n">{counts[option] ?? 0}</span>}</button>)}
          </div>
          <ViewToggle view={view} onChange={setView} />
        </div>
        <div className="adm-toolbar">
          <label htmlFor="proposal-search" className="sr-only">Rechercher une proposition</label>
          <input id="proposal-search" className="adm-search" type="search" placeholder="Rechercher un code, un outil, un créateur, un e-mail…" value={query} onChange={event => setQuery(event.target.value)} />
          <label htmlFor="category-filter" className="sr-only">Catégorie</label>
          <AdminSelect id="category-filter" variant="filter" ariaLabel="Catégorie" value={category} onChange={setCategory} options={[{ value: '', label: 'Toutes les catégories' }, ...categories.map(item => ({ value: item.name, label: item.name }))]} searchPlaceholder="Rechercher une catégorie…" />
          <label htmlFor="from-filter" className="sr-only">Du</label>
          <input id="from-filter" className="adm-search" style={{ flex: '0 1 160px' }} type="date" value={from} onChange={event => setFrom(event.target.value)} title="Du" />
          <label htmlFor="to-filter" className="sr-only">Au</label>
          <input id="to-filter" className="adm-search" style={{ flex: '0 1 160px' }} type="date" value={to} onChange={event => setTo(event.target.value)} title="Au" />
          {view !== 'table' && <SortControl sort={sort} id="proposal-sort" />}
          <button type="button" className="adm-btn" onClick={resetFilters}>Réinitialiser</button>
          {!loading && <span className="adm-count" role="status">{visible.length} sur {items.length}</span>}
        </div>
        <LetterBar sort={sort} />
        <div ref={topRef} className="adm-list-top" />
        {error && <div className="notice notice-error" role="alert" style={{ marginBottom: 12 }}>{error}</div>}
        {loading ? <p className="muted">Chargement de la file…</p> : visible.length === 0 ? <div className="adm-empty">{items.length === 0 ? 'Aucune proposition ici. Modifie les filtres ou la période.' : 'Aucune proposition ne correspond à cette recherche.'}</div> : view === 'table' ? (
          <div className="adm-table-wrap adm-page-enter" key={`table-${current.page}`}>
            <table className="adm-table">
              <thead>
                <tr><SortHeader sort={sort} field="code">Code</SortHeader><SortHeader sort={sort} field="tool">Outil</SortHeader><th scope="col">Réduction</th><SortHeader sort={sort} field="creator">Créateur</SortHeader><SortHeader sort={sort} field="received">Reçue le</SortHeader><th scope="col">E-mail</th><th scope="col">Commentaire</th><th scope="col">Statut</th><th scope="col">Liens</th><th scope="col"><span className="sr-only">Décision</span></th></tr>
              </thead>
              <tbody>
                {current.items.map(item => (
                  <tr key={item.id} data-open onClick={openOnClick(() => setSelectedId(item.id))}>
                    <td className="mono"><span className="adm-code-cell"><button type="button" className="adm-open" title={`Voir le détail de ${item.code}`} onClick={() => setSelectedId(item.id)}>{item.code}</button><CopyCode code={item.code} /></span></td>
                    <td className="adm-cell-wrap">{item.tool_name}</td>
                    <td className="adm-cell-wrap">{item.discount_label}</td>
                    <td className="adm-cell-wrap">{item.creator_name}</td>
                    <td className="adm-cell-muted adm-cell-nowrap">{parisDate(item.created_at, { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                    <td className="adm-cell-muted adm-cell-clip" title={item.submitter_email ?? undefined}>{item.submitter_email || '—'}</td>
                    <td className="adm-cell-muted adm-cell-wrap">{item.comment || '—'}</td>
                    <td><span className={statusPill[item.status] || 'adm-pill'}>{statusName[item.status] || item.status}</span></td>
                    <td className="adm-cell-nowrap"><a href={item.source_url} target="_blank" rel="noopener noreferrer">Source ↗</a>{item.creator_link && <> · <a href={item.creator_link} target="_blank" rel="noopener noreferrer">Lien ↗</a></>}</td>
                    <td><div className="adm-cell-actions">{decisionButtons(item)}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="adm-grid adm-page-enter" key={`grid-${current.page}`}>
            {current.items.map(item => (
              <article className="adm-card" key={item.id} data-open onClick={openOnClick(() => setSelectedId(item.id))}>
                <div className="adm-card-row"><button type="button" className="mono adm-open" title={`Voir le détail de ${item.code}`} onClick={() => setSelectedId(item.id)}>{item.code}</button><CopyCode code={item.code} /><span className="adm-card-date">{parisDate(item.created_at, { day: '2-digit', month: '2-digit' })}</span><StatusDot tone={statusTone[item.status] ?? 'muted'}>{statusName[item.status] || item.status}</StatusDot></div>
                <p className="adm-card-line" title={`${item.tool_name} · ${item.discount_label} · ${item.creator_name}`}>{item.tool_name} <span>· {item.discount_label} · {item.creator_name}</span></p>
                <p className="adm-card-sub is-quote" title={[item.comment, item.submitter_email].filter(Boolean).join(' · ') || undefined}>{item.comment ? `« ${item.comment} »` : 'Sans commentaire'}</p>
                <div className="adm-card-foot">
                  {decisionButtons(item)}
                  <span className="adm-card-push" />
                  {item.creator_link && <IconLink icon="external" label="Lien du créateur" href={item.creator_link} external />}
                  <IconLink icon="external" label="Voir la source" href={item.source_url} external />
                </div>
              </article>
            ))}
          </div>
        )}
        {!loading && <Pagination current={current} onChange={goTo} label="propositions" size={size} onSizeChange={changeSize} />}
        <AdminDrawer open={selected !== null} onClose={() => setSelectedId(null)} label={`Proposition ${selected?.code ?? ''}`} eyebrow="Proposition"
          title={selected && <span className="adm-code-cell"><span className="mono">{selected.code}</span><CopyCode code={selected.code} /></span>}
          aside={selected && <StatusDot tone={statusTone[selected.status] ?? 'muted'}>{statusName[selected.status] || selected.status}</StatusDot>}
          actions={selected && decisionButtons(selected)}>
          {selected && <>
            <DetailList items={[
              { label: 'Outil', value: selected.tool_name },
              { label: 'Catégorie', value: selected.category },
              { label: 'Réduction', value: selected.discount_label },
              { label: 'Créateur', value: selected.creator_name },
              { label: 'Source', value: <a href={selected.source_url} target="_blank" rel="noopener noreferrer">Ouvrir la source ↗</a> },
              { label: 'Lien du créateur', value: selected.creator_link && <a href={selected.creator_link} target="_blank" rel="noopener noreferrer">Ouvrir ↗</a> },
              { label: 'Reçue le', value: parisDate(selected.created_at, { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) },
              { label: 'E-mail', value: selected.submitter_email && <a href={`mailto:${selected.submitter_email}`}>{selected.submitter_email}</a> },
              { label: 'Note de décision', value: selected.admin_note },
            ]} />
            {selected.comment && <p className="adm-detail-quote">« {selected.comment} »</p>}
          </>}
        </AdminDrawer>
        <CodeEditor target={editing} tools={tools} categories={categories} creators={creators} existing={existing} onClose={() => setEditing(null)} onSaved={() => { void load(); window.dispatchEvent(new Event(SUBMISSIONS_CHANGED)); }} />
      </div>
    </main>
  );
}
