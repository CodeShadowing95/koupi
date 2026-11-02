'use client';
// Catégories d'outils, avec leur couverture : combien de leurs outils ont un code visible.
import { useEffect, useState } from 'react';
import type { AdminCategory } from '@/lib/catalog-admin';
import { ViewToggle, useAdminView } from '@/components/admin-view-toggle';
import { FormDialog, sendJson } from '@/components/admin-form-dialog';
import { LetterBar, SortControl, SortHeader, useAdminSort, type SortField } from '@/components/admin-sort';
import { matchesSearch } from '@/lib/admin-search';
import { IconButton, IconLink, StatusDot } from '@/components/admin-card';
import { ExportMenu } from '@/components/admin-export-menu';
import { AdminDrawer, DetailList, openOnClick } from '@/components/admin-drawer';

const rate = (category: AdminCategory) => category.tools ? Math.round((category.covered / category.tools) * 100) : 0;

type Filter = 'all' | 'covered' | 'empty';
const filters: { value: Filter; label: string }[] = [{ value: 'all', label: 'Toutes' }, { value: 'covered', label: 'Sur le site' }, { value: 'empty', label: 'Vides sur le site' }];
const matches = (category: AdminCategory, filter: Filter) => filter === 'all' || (filter === 'covered' ? category.covered > 0 : category.covered === 0);

const sortFields: SortField<AdminCategory>[] = [
  { key: 'name', label: 'Nom', value: category => category.name, text: true },
  { key: 'tools', label: 'Nombre d’outils', value: category => category.tools },
  { key: 'coverage', label: 'Couverture', value: category => rate(category) },
];

export function CategoriesView({ categories: all }: { categories: AdminCategory[] }) {
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  // Les liens des autres pages ouvrent la liste déjà filtrée (?q=…).
  useEffect(() => { const q = new URLSearchParams(window.location.search).get('q'); if (q) setQuery(q); }, []);
  const filtered = all.filter(category => matches(category, filter) && matchesSearch([category.name, category.slug], query));
  const sort = useAdminSort(filtered, sortFields, 'name');
  const categories = sort.items;
  const countOf = (value: Filter) => all.filter(category => matches(category, value)).length;
  const [view, setView] = useAdminView();
  const [editing, setEditing] = useState<AdminCategory | 'new' | null>(null);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const selected = all.find(category => category.slug === selectedSlug) ?? null;
  const [name, setName] = useState('');
  const open = (target: AdminCategory | 'new') => { setName(target === 'new' ? '' : target.name); setEditing(target); };
  const coverage = (category: AdminCategory) => (
    <span className="adm-cat-cover">
      <span className="adm-track" role="img" aria-label={`${category.covered} outils couverts sur ${category.tools}`}><span style={{ width: `${rate(category)}%` }} /></span>
      <span>{category.covered} / {category.tools}</span>
    </span>
  );

  return (
    <main className="adm-page">
      <div className="container">
        <div className="adm-head">
          <div>
            <span className="eyebrow">Catalogue</span>
            <h1>Catégories</h1>
            <p>Elles rangent les outils sur le site. La couverture dit combien de leurs outils ont au moins un code visible : une catégorie à 0 est vide sur le site.</p>
          </div>
          <div className="adm-head-actions"><ExportMenu type="categories" /><button type="button" className="adm-btn adm-btn-pri" onClick={() => open('new')}>+ Nouvelle catégorie</button></div>
        </div>
        <div className="adm-tabs" role="group" aria-label="Filtre">
          {filters.map(item => <button key={item.value} type="button" className="adm-tab" aria-pressed={filter === item.value} onClick={() => setFilter(item.value)}>{item.label} <span className="adm-tab-n">{countOf(item.value)}</span></button>)}
        </div>
        <div className="adm-toolbar">
          <label htmlFor="category-search" className="sr-only">Rechercher une catégorie</label>
          <input id="category-search" className="adm-search" type="search" placeholder="Rechercher une catégorie…" value={query} onChange={event => setQuery(event.target.value)} />
          {view !== 'table' && <SortControl sort={sort} id="category-sort" />}
          <span className="adm-count" role="status">{categories.length} sur {countOf(filter)}</span>
          <ViewToggle view={view} onChange={setView} />
        </div>
        <LetterBar sort={sort} />
        {categories.length === 0 ? <div className="adm-empty">Aucune catégorie ne correspond.</div> : view === 'table' ? (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead><tr><SortHeader sort={sort} field="name">Catégorie</SortHeader><SortHeader sort={sort} field="tools">Outils couverts</SortHeader><SortHeader sort={sort} field="coverage">Couverture</SortHeader><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {categories.map(category => (
                  <tr key={category.slug} data-open onClick={openOnClick(() => setSelectedSlug(category.slug))}>
                    <td className="adm-cell-wrap"><button type="button" className="adm-open adm-open-wrap" title={`Voir le détail de ${category.name}`} onClick={() => setSelectedSlug(category.slug)}><b>{category.name}</b></button></td>
                    <td>{coverage(category)}</td>
                    <td className="adm-cell-muted">{rate(category)} %</td>
                    <td><div className="adm-cell-actions"><a href={`/admin/outils?category=${encodeURIComponent(category.slug)}`}>Outils</a><button type="button" className="adm-btn" onClick={() => open(category)}>Renommer</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="adm-grid">
            {categories.map(category => (
              <article className="adm-card" key={category.slug} data-open onClick={openOnClick(() => setSelectedSlug(category.slug))}>
                <div className="adm-card-row"><button type="button" className="adm-open adm-card-title" title={`Voir le détail de ${category.name}`} onClick={() => setSelectedSlug(category.slug)}><b>{category.name}</b></button>{category.covered === 0 ? <StatusDot tone="muted">Vide</StatusDot> : <StatusDot tone="ok">{rate(category)} %</StatusDot>}</div>
                <span className="adm-track" role="img" aria-label={`${category.covered} outils couverts sur ${category.tools}`}><span style={{ width: `${rate(category)}%` }} /></span>
                <div className="adm-card-foot">
                  <span className="adm-card-meta">{category.covered} / {category.tools} outil{category.tools > 1 ? 's' : ''} couvert{category.covered > 1 ? 's' : ''}</span>
                  <IconLink icon="list" label="Voir les outils" href={`/admin/outils?category=${encodeURIComponent(category.slug)}`} />
                  <IconButton icon="edit" label="Renommer" onClick={() => open(category)} />
                </div>
              </article>
            ))}
          </div>
        )}
        <AdminDrawer open={selected !== null} onClose={() => setSelectedSlug(null)} label={`Détail de ${selected?.name ?? ''}`} eyebrow="Catégorie" title={selected?.name}
          aside={selected && (selected.covered === 0 ? <StatusDot tone="muted">Vide</StatusDot> : <StatusDot tone="ok">{rate(selected)} %</StatusDot>)}
          actions={selected && <>
            <a className="adm-btn" href={`/admin/outils?category=${encodeURIComponent(selected.slug)}`}>Voir les outils</a>
            <span style={{ flex: 1 }} />
            <button type="button" className="adm-btn adm-btn-pri" onClick={() => open(selected)}>Renommer</button>
          </>}>
          {selected && <>
            {coverage(selected)}
            <DetailList items={[
              { label: 'Outils suivis', value: `${selected.tools} outil${selected.tools > 1 ? 's' : ''}` },
              { label: 'Sur le site', value: `${selected.covered} avec un code visible` },
              { label: 'À couvrir', value: `${selected.tools - selected.covered} sans code visible` },
              { label: 'Page publique', value: selected.covered > 0 && <a href={`/categories/${selected.slug}`} target="_blank" rel="noopener noreferrer">/categories/{selected.slug} ↗</a> },
            ]} />
          </>}
        </AdminDrawer>
        <FormDialog open={editing !== null} title={editing === 'new' ? 'Nouvelle catégorie' : `Renommer ${editing?.name ?? ''}`}
          intro={editing === 'new' ? 'Elle apparaîtra sur le site dès qu’un de ses outils aura un code visible.' : 'Son adresse sur le site ne change pas.'}
          onClose={() => setEditing(null)}
          onSubmit={() => editing === 'new' ? sendJson('/api/admin/categories', 'POST', { name }) : sendJson(`/api/admin/categories/${(editing as AdminCategory).slug}`, 'PATCH', { name })}>
          <div className="field adm-span-2"><label htmlFor="category-name">Nom</label><input id="category-name" value={name} onChange={event => setName(event.target.value)} required maxLength={80} /></div>
        </FormDialog>
      </div>
    </main>
  );
}
