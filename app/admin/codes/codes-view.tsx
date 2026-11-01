'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Category, Code } from '@/lib/data';
import type { ToolOption } from '@/lib/codes-admin';
import { CodeEditor, type EditorTarget } from '@/components/admin-code-editor';
import { matchesSearch } from '@/lib/admin-search';
import { RETEST_DAYS, staleCodes } from '@/lib/admin-stats';
import { ViewToggle, useAdminView } from '@/components/admin-view-toggle';
import { Pagination, usePagination } from '@/components/admin-pagination';
import { LetterBar, SortControl, SortHeader, useAdminSort, type SortField } from '@/components/admin-sort';

const statusLabel: Record<Code['status'], { label: string; className: string }> = {
  verified: { label: 'Vérifié', className: 'adm-pill adm-pill-ok' },
  to_test: { label: 'À tester', className: 'adm-pill adm-pill-warn' },
  pending: { label: 'En attente', className: 'adm-pill' },
  rejected: { label: 'Rejeté', className: 'adm-pill adm-pill-bad' },
};
type Filter = 'all' | 'archived' | 'retest' | Code['status'];
const filters: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Tous' }, { value: 'to_test', label: 'À tester' }, { value: 'retest', label: 'À retester' }, { value: 'pending', label: 'En attente' }, { value: 'verified', label: 'Vérifiés' }, { value: 'rejected', label: 'Rejetés' }, { value: 'archived', label: 'Archivés' },
];
const matchesFilter = (code: Code, filter: Filter, stale: Set<string>) => filter === 'archived' ? Boolean(code.archived) : filter === 'retest' ? stale.has(code.id) : !code.archived && (filter === 'all' || code.status === filter);
const testedLabel = (iso: string | null) => iso ? `Testé le ${new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}` : 'Jamais testé';
const sortFields: SortField<Code>[] = [
  { key: 'created', label: 'Date d’ajout', value: code => code.createdAt, defaultDir: 'desc' },
  { key: 'code', label: 'Code', value: code => code.code, text: true },
  { key: 'tool', label: 'Outil', value: code => code.tool, text: true },
  { key: 'creator', label: 'Créateur', value: code => code.creator, text: true },
  { key: 'votes', label: 'Votes', value: code => code.votes, defaultDir: 'desc' },
  { key: 'success', label: 'Réussite', value: code => code.success, defaultDir: 'desc' },
  { key: 'tested', label: 'Dernier test', value: code => code.lastTestedAt, defaultDir: 'desc' },
];
const isFilter = (value: string | null): value is Filter => filters.some(filter => filter.value === value);

export function CodesView({ codes, tools, categories }: { codes: Code[]; tools: ToolOption[]; categories: Category[] }) {
  const stale = new Set(staleCodes(codes).map(code => code.id));
  const countOf = (value: Filter) => codes.filter(code => matchesFilter(code, value, stale)).length;
  const router = useRouter();
  const [editing, setEditing] = useState<EditorTarget | null>(null);
  const [busy, setBusy] = useState('');
  const creators = [...new Set(codes.map(code => code.creator))].sort((a, b) => a.localeCompare(b, 'fr'));
  async function quick(code: Code, action: 'verify' | 'reject' | 'restore') {
    setBusy(code.id);
    const response = await fetch(`/api/admin/codes/${code.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action }) }).catch(() => null);
    if (!response?.ok) window.alert('Le changement n’a pas pu être enregistré. Réessaie.');
    setBusy('');
    router.refresh();
  }
  const actions = (code: Code) => code.archived
    ? <button type="button" className="adm-btn" disabled={busy === code.id} onClick={() => quick(code, 'restore')}>Restaurer</button>
    : <span className="adm-quick">
        {(code.status !== 'verified' || stale.has(code.id)) && <button type="button" className="adm-btn adm-btn-ok" disabled={busy === code.id} onClick={() => quick(code, 'verify')} title="Tu l’as essayé et il marche">✓ Marche</button>}
        {code.status !== 'rejected' && <button type="button" className="adm-btn adm-btn-no" disabled={busy === code.id} onClick={() => quick(code, 'reject')} title="Tu l’as essayé et il ne marche pas">✗ Ne marche pas</button>}
      </span>;
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<Filter>('all');
  const [view, setView] = useAdminView();
  // Les liens de l'accueil ouvrent la liste déjà filtrée (?status=to_test, ?q=CODE).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('status');
    if (isFilter(fromUrl)) setStatus(fromUrl);
    if (params.get('q')) setQuery(params.get('q') ?? '');
  }, []);
  const filtered = codes.filter(code => matchesFilter(code, status, stale) && matchesSearch([code.code, code.tool, code.creator, code.discount, code.sourceTitle, code.note ?? ''], query));
  const sort = useAdminSort(filtered, sortFields, { key: 'created', dir: 'desc' }, 'tool');
  const visible = sort.items;
  const { current, goTo, topRef, size, changeSize } = usePagination(visible, `${status}|${query}|${sort.resetKey}`);
  return (
    <main className="adm-page">
      <div className="container">
        <div className="adm-head">
          <div>
            <span className="eyebrow">Modération</span>
            <h1>Codes</h1>
            <p>Vérifie la source, complète la réduction, puis publie uniquement les codes fiables. Seuls les codes vérifiés et à tester sont visibles sur le site.</p>
          </div>
          <div className="adm-head-actions"><a className="adm-btn" href="/api/admin/export?type=codes" download>Exporter en CSV</a><button type="button" className="adm-btn adm-btn-pri" onClick={() => setEditing({ kind: 'create' })}>+ Nouveau code</button></div>
        </div>
        <div className="adm-tabs" role="group" aria-label="Statut">
          {filters.map(filter => <button key={filter.value} type="button" className="adm-tab" aria-pressed={status === filter.value} onClick={() => setStatus(filter.value)}>{filter.label} {(filter.value === 'to_test' || filter.value === 'retest') && countOf(filter.value) > 0 && status !== filter.value ? <span className="adm-count-badge">{countOf(filter.value)}</span> : <span className="adm-tab-n">{countOf(filter.value)}</span>}</button>)}
        </div>
        {status === 'retest' && <p className="adm-hint">Codes vérifiés il y a plus de {RETEST_DAYS} jours, ou jamais testés depuis l’import. Essaie-les à nouveau : « ✓ Marche » remet la date du test à aujourd’hui.</p>}
        <div className="adm-toolbar">
          <label htmlFor="code-search" className="sr-only">Rechercher un code</label>
          <input id="code-search" className="adm-search" type="search" placeholder="Rechercher un code, un outil, un créateur…" value={query} onChange={event => setQuery(event.target.value)} />
          <SortControl sort={sort} id="code-sort" />
          <span className="adm-count" role="status">{visible.length} sur {countOf(status)}</span>
          <ViewToggle view={view} onChange={setView} />
        </div>
        <LetterBar sort={sort} />
        <div ref={topRef} className="adm-list-top" />
        {visible.length === 0 ? <div className="adm-empty">Aucun code ne correspond à cette recherche.</div> : view === 'table' ? (
          <div className="adm-table-wrap adm-page-enter" key={`table-${current.page}`}>
            <table className="adm-table">
              <thead>
                <tr><SortHeader sort={sort} field="code">Code</SortHeader><SortHeader sort={sort} field="tool">Outil</SortHeader><th scope="col">Réduction</th><SortHeader sort={sort} field="creator">Créateur</SortHeader><SortHeader sort={sort} field="votes">Votes</SortHeader><SortHeader sort={sort} field="success">Réussite</SortHeader><th scope="col">Statut</th><SortHeader sort={sort} field="tested">Test</SortHeader><th scope="col"><span className="sr-only">Actions</span></th></tr>
              </thead>
              <tbody>
                {current.items.map(code => (
                  <tr key={code.id}>
                    <td className="mono">{code.code}</td>
                    <td className="adm-cell-nowrap">{code.tool}</td>
                    <td className="adm-cell-wrap">{code.discount}</td>
                    <td className="adm-cell-wrap">{code.creator}</td>
                    <td className="adm-cell-muted">{code.votes}</td>
                    <td className="adm-cell-muted adm-cell-nowrap">{code.success} %</td>
                    <td><span className={statusLabel[code.status].className}>{statusLabel[code.status].label}</span></td>
                    <td className="adm-cell-muted adm-cell-nowrap">{testedLabel(code.lastTestedAt)}</td>
                    <td><div className="adm-cell-actions">{actions(code)}<a href={code.source} target="_blank" rel="noopener noreferrer">Source ↗</a><button type="button" className="adm-btn" onClick={() => setEditing({ kind: 'edit', code })}>Modifier</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="adm-grid adm-page-enter" key={`grid-${current.page}`}>
            {current.items.map(code => (
              <article className="adm-card" key={code.id}>
                <div className="adm-card-top"><span className="mono">{code.code}</span><span className={statusLabel[code.status].className}>{statusLabel[code.status].label}</span></div>
                <h3>{code.tool} · {code.discount}</h3>
                <p>{code.creator} · {code.votes} votes, {code.success} % de réussite</p>
                {code.note && <p className="adm-note">Note : {code.note}</p>}
                <p className="adm-tested">{testedLabel(code.lastTestedAt)}</p>
                <div className="adm-card-foot">
                  {actions(code)}
                  <a href={code.source} target="_blank" rel="noopener noreferrer">Source ↗</a>
                  <button type="button" className="adm-btn" style={{ marginLeft: 'auto' }} onClick={() => setEditing({ kind: 'edit', code })}>Modifier</button>
                </div>
              </article>
            ))}
          </div>
        )}
        <Pagination current={current} onChange={goTo} label="codes" size={size} onSizeChange={changeSize} />
        <CodeEditor target={editing} tools={tools} categories={categories} creators={creators} onClose={() => setEditing(null)} />
      </div>
    </main>
  );
}
