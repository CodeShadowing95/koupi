'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Category, Code } from '@/lib/data';
import type { ToolOption } from '@/lib/codes-admin';
import { CodeEditor, type EditorTarget } from '@/components/admin-code-editor';
import { matchesSearch } from '@/lib/admin-search';
import { RETEST_DAYS, staleCodes } from '@/lib/admin-stats';
import { expiryOf } from '@/lib/code-expiry';
import { ViewToggle, useAdminView } from '@/components/admin-view-toggle';
import { Pagination, usePagination } from '@/components/admin-pagination';
import { LetterBar, SortControl, SortHeader, useAdminSort, type SortField } from '@/components/admin-sort';
import { CopyCode, IconButton, IconLink, StatusDot, type Tone } from '@/components/admin-card';
import { ExportMenu } from '@/components/admin-export-menu';
import { AdminDrawer, DetailList, openOnClick } from '@/components/admin-drawer';

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
const statusTone: Record<Code['status'], Tone> = { verified: 'ok', to_test: 'warn', pending: 'muted', rejected: 'bad' };
const shortTested = (iso: string | null) => iso ? `testé le ${new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}` : 'jamais testé';
const cardMeta = (code: Code) => `${code.creator} · ${code.votes} vote${code.votes > 1 ? 's' : ''}${code.votes > 0 ? ` · ${code.success} %` : ''} · ${shortTested(code.lastTestedAt)}`;
const testedLabel = (iso: string | null) => iso ? `Testé le ${new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}` : 'Jamais testé';
const sortFields: SortField<Code>[] = [
  { key: 'created', label: 'Date d’ajout', value: code => code.createdAt },
  { key: 'code', label: 'Code', value: code => code.code, text: true },
  { key: 'tool', label: 'Outil', value: code => code.tool, text: true },
  { key: 'creator', label: 'Créateur', value: code => code.creator, text: true },
  { key: 'votes', label: 'Votes', value: code => code.votes },
  { key: 'success', label: 'Réussite', value: code => code.success },
  { key: 'tested', label: 'Dernier test', value: code => code.lastTestedAt },
];
const isFilter = (value: string | null): value is Filter => filters.some(filter => filter.value === value);

export function CodesView({ codes, tools, categories }: { codes: Code[]; tools: ToolOption[]; categories: Category[] }) {
  const stale = new Set(staleCodes(codes).map(code => code.id));
  const countOf = (value: Filter) => codes.filter(code => matchesFilter(code, value, stale)).length;
  const router = useRouter();
  const [editing, setEditing] = useState<EditorTarget | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = codes.find(code => code.id === selectedId) ?? null;
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
  const iconActions = (code: Code) => code.archived
    ? <IconButton icon="restore" label="Restaurer" disabled={busy === code.id} onClick={() => quick(code, 'restore')} />
    : <>
        {(code.status !== 'verified' || stale.has(code.id)) && <IconButton icon="check" tone="ok" label="Il marche (tu l’as essayé)" disabled={busy === code.id} onClick={() => quick(code, 'verify')} />}
        {code.status !== 'rejected' && <IconButton icon="cross" tone="bad" label="Il ne marche pas (tu l’as essayé)" disabled={busy === code.id} onClick={() => quick(code, 'reject')} />}
      </>;
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
  const sort = useAdminSort(filtered, sortFields, 'tool');
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
          <div className="adm-head-actions"><ExportMenu type="codes" /><button type="button" className="adm-btn adm-btn-pri" onClick={() => setEditing({ kind: 'create' })}>+ Nouveau code</button></div>
        </div>
        <div className="adm-tabs" role="group" aria-label="Statut">
          {filters.map(filter => <button key={filter.value} type="button" className="adm-tab" aria-pressed={status === filter.value} onClick={() => setStatus(filter.value)}>{filter.label} {(filter.value === 'to_test' || filter.value === 'retest') && countOf(filter.value) > 0 && status !== filter.value ? <span className="adm-count-badge">{countOf(filter.value)}</span> : <span className="adm-tab-n">{countOf(filter.value)}</span>}</button>)}
        </div>
        {status === 'retest' && <p className="adm-hint">Codes vérifiés il y a plus de {RETEST_DAYS} jours, ou jamais testés depuis l’import. Essaie-les à nouveau : « ✓ Marche » remet la date du test à aujourd’hui.</p>}
        <div className="adm-toolbar">
          <label htmlFor="code-search" className="sr-only">Rechercher un code</label>
          <input id="code-search" className="adm-search" type="search" placeholder="Rechercher un code, un outil, un créateur…" value={query} onChange={event => setQuery(event.target.value)} />
          {view !== 'table' && <SortControl sort={sort} id="code-sort" />}
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
                  <tr key={code.id} data-open onClick={openOnClick(() => setSelectedId(code.id))}>
                    <td className="mono"><span className="adm-code-cell"><button type="button" className="adm-open" title={`Voir le détail de ${code.code}`} onClick={() => setSelectedId(code.id)}>{code.code}</button><CopyCode code={code.code} /></span></td>
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
              <article className="adm-card" key={code.id} data-open onClick={openOnClick(() => setSelectedId(code.id))}>
                <div className="adm-card-row"><button type="button" className="mono adm-open" title={`Voir le détail de ${code.code}`} onClick={() => setSelectedId(code.id)}>{code.code}</button><CopyCode code={code.code} /><StatusDot tone={statusTone[code.status]}>{statusLabel[code.status].label}</StatusDot></div>
                <p className="adm-card-line" title={`${code.tool} · ${code.discount}`}>{code.tool} <span>· {code.discount}</span></p>
                <div className="adm-card-foot">
                  <span className="adm-card-meta" title={[cardMeta(code), code.note && `Note : ${code.note}`].filter(Boolean).join('\n')}>{cardMeta(code)}</span>
                  {iconActions(code)}
                  <IconLink icon="external" label="Voir la source" href={code.source} external />
                  <IconButton icon="edit" label="Modifier" onClick={() => setEditing({ kind: 'edit', code })} />
                </div>
              </article>
            ))}
          </div>
        )}
        <Pagination current={current} onChange={goTo} label="codes" size={size} onSizeChange={changeSize} />
        <AdminDrawer open={selected !== null} onClose={() => setSelectedId(null)} label={`Détail du code ${selected?.code ?? ''}`} eyebrow={selected?.archived ? 'Code archivé' : 'Code'}
          title={selected && <span className="adm-code-cell"><span className="mono">{selected.code}</span><CopyCode code={selected.code} /></span>}
          aside={selected && <StatusDot tone={statusTone[selected.status]}>{statusLabel[selected.status].label}</StatusDot>}
          actions={selected && <>{actions(selected)}<span style={{ flex: 1 }} /><button type="button" className="adm-btn adm-btn-pri" onClick={() => setEditing({ kind: 'edit', code: selected })}>Modifier</button></>}>
          {selected && <>
            <DetailList items={[
              { label: 'Outil', value: <a href={`/admin/outils?q=${encodeURIComponent(selected.tool)}`}>{selected.tool}</a> },
              { label: 'Réduction', value: selected.discount },
              { label: 'Créateur', value: <a href={`/admin/createurs?q=${encodeURIComponent(selected.creator)}`}>{selected.creator}</a> },
              { label: 'Source', value: <a href={selected.source} target="_blank" rel="noopener noreferrer">{selected.sourceTitle || 'Ouvrir la source'} ↗</a> },
              { label: 'Lien du créateur', value: selected.creatorLink && <a href={selected.creatorLink} target="_blank" rel="noopener noreferrer">Ouvrir ↗</a> },
              { label: 'Votes', value: selected.votes > 0 ? `${selected.votes} vote${selected.votes > 1 ? 's' : ''} · ${selected.success} % de réussite` : 'Aucun vote' },
              { label: 'Dernier test', value: testedLabel(selected.lastTestedAt) + (stale.has(selected.id) ? ' · à retester' : '') },
              { label: 'Testé au paiement', value: selected.paymentTestedAt && new Date(selected.paymentTestedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) },
              { label: 'Valable jusqu’au', value: selected.expiresOn && `${new Date(`${selected.expiresOn}T12:00:00Z`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}${expiryOf(selected.expiresOn).state === 'expired' ? ' · date passée' : ''}` },
              { label: 'Ajouté le', value: new Date(selected.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) },
            ]} />
            {selected.note && <p className="adm-detail-quote">Note : {selected.note}</p>}
          </>}
        </AdminDrawer>
        <CodeEditor target={editing} tools={tools} categories={categories} creators={creators} onClose={() => setEditing(null)} />
      </div>
    </main>
  );
}
