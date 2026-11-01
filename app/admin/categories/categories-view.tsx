'use client';
// Catégories d'outils, avec leur couverture : combien de leurs outils ont un code visible.
import { useEffect, useState } from 'react';
import type { AdminCategory } from '@/lib/catalog-admin';
import { ViewToggle, useAdminView } from '@/components/admin-view-toggle';
import { FormDialog, sendJson } from '@/components/admin-form-dialog';
import { LetterBar, SortControl, SortHeader, useAdminSort, type SortField } from '@/components/admin-sort';
import { matchesSearch } from '@/lib/admin-search';

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
          <div className="adm-head-actions"><button type="button" className="adm-btn adm-btn-pri" onClick={() => open('new')}>+ Nouvelle catégorie</button></div>
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
                  <tr key={category.slug}>
                    <td className="adm-cell-wrap"><b>{category.name}</b></td>
                    <td>{coverage(category)}</td>
                    <td className="adm-cell-muted">{rate(category)} %</td>
                    <td><div className="adm-cell-actions"><a href={`/admin/outils?q=${encodeURIComponent(category.name)}`}>Outils</a><button type="button" className="adm-btn" onClick={() => open(category)}>Renommer</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="adm-grid">
            {categories.map(category => (
              <article className="adm-card" key={category.slug}>
                <div className="adm-card-top"><b>{category.name}</b>{category.covered === 0 ? <span className="adm-pill adm-pill-warn">Vide sur le site</span> : <span className="adm-pill adm-pill-ok">{rate(category)} %</span>}</div>
                {coverage(category)}
                <div className="adm-card-foot">
                  <a href={`/admin/outils?q=${encodeURIComponent(category.name)}`}>Voir les outils</a>
                  <button type="button" className="adm-btn" style={{ marginLeft: 'auto' }} onClick={() => open(category)}>Renommer</button>
                </div>
              </article>
            ))}
          </div>
        )}
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
