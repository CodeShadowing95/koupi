'use client';
// Créateurs crédités : leurs codes et les outils qu'ils recommandent. Les comptes sur chaque réseau
// (YouTube, TikTok, Instagram…) et leur vérification viendront ici.
import { useEffect, useState } from 'react';
import type { AdminCreator } from '@/lib/catalog-admin';
import { matchesSearch } from '@/lib/admin-search';
import { ViewToggle, useAdminView } from '@/components/admin-view-toggle';
import { Pagination, usePagination } from '@/components/admin-pagination';
import { FormDialog, sendJson } from '@/components/admin-form-dialog';
import { LetterBar, SortControl, SortHeader, useAdminSort, type SortField } from '@/components/admin-sort';

type Filter = 'all' | 'visible' | 'hidden';
const filters: { value: Filter; label: string }[] = [{ value: 'all', label: 'Tous' }, { value: 'visible', label: 'Sur le site' }, { value: 'hidden', label: 'Sans code visible' }];
const matches = (creator: AdminCreator, filter: Filter) => filter === 'all' || (filter === 'visible' ? creator.visible > 0 : creator.visible === 0);

const sortFields: SortField<AdminCreator>[] = [
  { key: 'name', label: 'Nom', value: creator => creator.name, text: true },
  { key: 'codes', label: 'Nombre de codes', value: creator => creator.codes, defaultDir: 'desc' },
  { key: 'visible', label: 'Codes visibles', value: creator => creator.visible, defaultDir: 'desc' },
];

export function CreatorsView({ creators }: { creators: AdminCreator[] }) {
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  // Les liens des autres pages ouvrent la liste déjà filtrée (?q=…).
  useEffect(() => { const q = new URLSearchParams(window.location.search).get('q'); if (q) setQuery(q); }, []);
  const [view, setView] = useAdminView();
  const [editing, setEditing] = useState<AdminCreator | null>(null);
  const [name, setName] = useState('');
  const filtered = creators.filter(creator => matches(creator, filter) && matchesSearch([creator.name, ...creator.tools], query));
  const sort = useAdminSort(filtered, sortFields, { key: 'name', dir: 'asc' }, 'name');
  const visible = sort.items;
  const { current, goTo, topRef, size, changeSize } = usePagination(visible, `${filter}|${query}|${sort.resetKey}`);
  const countOf = (value: Filter) => creators.filter(creator => matches(creator, value)).length;
  const open = (creator: AdminCreator) => { setName(creator.name); setEditing(creator); };
  const codesLink = (creator: AdminCreator) => <a href={`/admin/codes?q=${encodeURIComponent(creator.name)}`}>{creator.visible} visible{creator.visible > 1 ? 's' : ''} / {creator.codes}</a>;
  const page = (creator: AdminCreator) => creator.visible > 0 ? <a href={`/creators/${creator.slug}`} target="_blank" rel="noopener noreferrer">Page ↗</a> : null;

  return (
    <main className="adm-page">
      <div className="container">
        <div className="adm-head">
          <div>
            <span className="eyebrow">Catalogue</span>
            <h1>Créateurs</h1>
            <p>Les personnes à qui appartiennent les codes. Un créateur est ajouté automatiquement avec son premier code ; ici, tu corriges son nom et tu vois ce qu’il recommande.</p>
          </div>
        </div>
        <div className="adm-tabs" role="group" aria-label="Filtre">
          {filters.map(item => <button key={item.value} type="button" className="adm-tab" aria-pressed={filter === item.value} onClick={() => setFilter(item.value)}>{item.label} <span className="adm-tab-n">{countOf(item.value)}</span></button>)}
        </div>
        <div className="adm-toolbar">
          <label htmlFor="creator-search" className="sr-only">Rechercher un créateur</label>
          <input id="creator-search" className="adm-search" type="search" placeholder="Rechercher un créateur, un outil…" value={query} onChange={event => setQuery(event.target.value)} />
          <SortControl sort={sort} id="creator-sort" />
          <span className="adm-count" role="status">{visible.length} sur {countOf(filter)}</span>
          <ViewToggle view={view} onChange={setView} />
        </div>
        <LetterBar sort={sort} />
        <div ref={topRef} className="adm-list-top" />
        {visible.length === 0 ? <div className="adm-empty">Aucun créateur ne correspond.</div> : view === 'table' ? (
          <div className="adm-table-wrap adm-page-enter" key={`table-${current.page}`}>
            <table className="adm-table">
              <thead><tr><SortHeader sort={sort} field="name">Créateur</SortHeader><SortHeader sort={sort} field="codes">Codes</SortHeader><th scope="col">Outils</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {current.items.map(creator => (
                  <tr key={creator.id}>
                    <td className="adm-cell-wrap"><b>{creator.name}</b></td>
                    <td className="adm-cell-nowrap">{codesLink(creator)}</td>
                    <td className="adm-cell-wrap adm-cell-muted">{creator.tools.join(', ') || '—'}</td>
                    <td><div className="adm-cell-actions">{page(creator)}<button type="button" className="adm-btn" onClick={() => open(creator)}>Renommer</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="adm-grid adm-page-enter" key={`grid-${current.page}`}>
            {current.items.map(creator => (
              <article className="adm-card" key={creator.id}>
                <div className="adm-card-top"><b>{creator.name}</b>{creator.visible > 0 ? <span className="adm-pill adm-pill-ok">Sur le site</span> : <span className="adm-pill">Masqué</span>}</div>
                <p>Codes : {codesLink(creator)}</p>
                <p className="adm-note">{creator.tools.join(', ') || 'Aucun outil'}</p>
                <div className="adm-card-foot">
                  {page(creator)}
                  <button type="button" className="adm-btn" style={{ marginLeft: 'auto' }} onClick={() => open(creator)}>Renommer</button>
                </div>
              </article>
            ))}
          </div>
        )}
        <Pagination current={current} onChange={goTo} label="créateurs" size={size} onSizeChange={changeSize} />

        <FormDialog open={editing !== null} title={`Renommer ${editing?.name ?? ''}`} intro="Corrige l’orthographe ou le nom de la chaîne. L’adresse de sa page sur le site ne change pas."
          onClose={() => setEditing(null)} onSubmit={() => sendJson(`/api/admin/creators/${editing?.id}`, 'PATCH', { name })}>
          <div className="field adm-span-2"><label htmlFor="creator-name">Nom</label><input id="creator-name" value={name} onChange={event => setName(event.target.value)} required maxLength={160} /></div>
        </FormDialog>
      </div>
    </main>
  );
}
