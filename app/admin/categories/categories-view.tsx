'use client';
// Catégories d'outils, avec leur couverture : combien de leurs outils ont un code visible.
import { useEffect, useState } from 'react';
import type { AdminCategory, CategoryFamily } from '@/lib/catalog-admin';
import { AdminSelect } from '@/components/admin-select';
import { ViewToggle, useAdminView } from '@/components/admin-view-toggle';
import { FormDialog, sendJson } from '@/components/admin-form-dialog';
import { LetterBar, SortControl, SortHeader, useAdminSort, type SortField } from '@/components/admin-sort';
import { matchesSearch } from '@/lib/admin-search';
import { IconButton, IconLink, StatusDot } from '@/components/admin-card';
import { ExportMenu } from '@/components/admin-export-menu';
import { AdminDrawer, DetailList, openOnClick } from '@/components/admin-drawer';
import type { CategorySearchReport } from '@/lib/category-code-search';

/** Ce que la recherche de codes peut utiliser : la clé YouTube (obligatoire) et l'IA (facultative). */
export type CodeSearchAvailability = { youtube: boolean; ai: { active: boolean; label: string } };
type SearchResult = CategorySearchReport & { scope: string };
const plural = (count: number, word: string, many = `${word}s`) => `${count} ${count > 1 ? many : word}`;

const rate = (category: AdminCategory) => category.tools ? Math.round((category.covered / category.tools) * 100) : 0;

type Filter = 'all' | 'covered' | 'empty';
const filters: { value: Filter; label: string }[] = [{ value: 'all', label: 'Toutes' }, { value: 'covered', label: 'Sur le site' }, { value: 'empty', label: 'Vides sur le site' }];
const matches = (category: AdminCategory, filter: Filter) => filter === 'all' || (filter === 'covered' ? category.covered > 0 : category.covered === 0);

const sortFields: SortField<AdminCategory>[] = [
  { key: 'name', label: 'Nom', value: category => category.name, text: true },
  { key: 'family', label: 'Famille', value: category => category.family ?? '', text: true },
  { key: 'tools', label: 'Nombre d’outils', value: category => category.tools },
  { key: 'coverage', label: 'Couverture', value: category => rate(category) },
];

// Famille choisie dans le filtre : '' = toutes, NONE = catégories pas encore rangées.
const NONE = '-';

export function CategoriesView({ categories: all, families, search }: { categories: AdminCategory[]; families: CategoryFamily[]; search: CodeSearchAvailability }) {
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [family, setFamily] = useState('');
  const inFamily = (category: AdminCategory) => !family || (family === NONE ? !category.familySlug : category.familySlug === family);
  // Les liens des autres pages ouvrent la liste déjà filtrée (?q=…).
  useEffect(() => { const q = new URLSearchParams(window.location.search).get('q'); if (q) setQuery(q); }, []);
  const filtered = all.filter(category => matches(category, filter) && inFamily(category) && matchesSearch([category.name, category.slug, category.family ?? ''], query));
  const sort = useAdminSort(filtered, sortFields, 'name');
  const categories = sort.items;
  const countOf = (value: Filter) => all.filter(category => matches(category, value) && inFamily(category)).length;
  const [view, setView] = useAdminView();
  const [editing, setEditing] = useState<AdminCategory | 'new' | null>(null);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const selected = all.find(category => category.slug === selectedSlug) ?? null;
  const [name, setName] = useState('');
  const [familySlug, setFamilySlug] = useState('');
  const open = (target: AdminCategory | 'new') => {
    setName(target === 'new' ? '' : target.name);
    setFamilySlug(target === 'new' ? (family && family !== NONE ? family : '') : target.familySlug ?? '');
    setEditing(target);
  };
  const unfiled = all.filter(category => !category.familySlug).length;
  const familyOptions = [{ value: '', label: 'Toutes les familles' }, ...families.map(item => ({ value: item.slug, label: item.name })), ...(unfiled ? [{ value: NONE, label: `Sans famille (${unfiled})` }] : [])];
  // La recherche « catégories vides » porte sur toutes les familles.
  const emptyCount = all.filter(category => matches(category, 'empty')).length;
  // Recherche de codes sur YouTube : toutes les catégories vides, ou une seule catégorie (slug).
  const [searching, setSearching] = useState<string | null>(null);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [searchError, setSearchError] = useState('');
  const searchCodes = async (target?: AdminCategory) => {
    setSearching(target?.slug ?? 'empty');
    setSearchError('');
    setResult(null);
    try {
      const response = await fetch('/api/admin/categories/search-codes', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(target ? { slug: target.slug } : {}) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) setSearchError(body.error ?? 'Recherche impossible pour le moment.');
      else { setResult({ ...body, scope: target ? target.name : 'les catégories vides' }); setSelectedSlug(null); }
    } catch {
      setSearchError('Recherche impossible : vérifie ta connexion.');
    } finally {
      setSearching(null);
    }
  };
  const searchTitle = !search.youtube ? 'La clé YouTube manque (YOUTUBE_API_KEY)' : undefined;
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
            <p>Elles rangent les outils sur le site, et chacune appartient à une famille (Sécurité, Vidéo…). La couverture dit combien de leurs outils ont au moins un code visible : une catégorie à 0 est vide sur le site.</p>
          </div>
          <div className="adm-head-actions"><ExportMenu type="categories" />
            <button type="button" className="adm-btn" disabled={!search.youtube || searching !== null || emptyCount === 0} title={searchTitle ?? (emptyCount === 0 ? 'Aucune catégorie vide' : `Cherche sur YouTube des codes pour les outils des ${plural(emptyCount, 'catégorie vide', 'catégories vides')}`)} onClick={() => searchCodes()}>{searching === 'empty' ? 'Recherche en cours…' : 'Chercher des codes'}</button>
            <button type="button" className="adm-btn adm-btn-pri" onClick={() => open('new')}>+ Nouvelle catégorie</button></div>
        </div>
        <p className="adm-search-state">
          <StatusDot tone={search.youtube ? 'ok' : 'muted'}>{search.youtube ? 'Recherche YouTube prête' : 'Recherche YouTube inactive (clé manquante)'}</StatusDot>
          <StatusDot tone={search.ai.active ? 'ok' : 'muted'}>{search.ai.active ? 'IA active' : `${search.ai.label} : lecture sans IA`}</StatusDot>
        </p>
        {searching && <div className="notice" role="status">Recherche sur YouTube pour {searching === 'empty' ? 'les catégories vides' : all.find(category => category.slug === searching)?.name}… Cela peut prendre une à deux minutes.</div>}
        {searchError && <div className="notice notice-error" role="alert">{searchError}</div>}
        {result && (
          <div className={`notice adm-pod-report${result.searches === 0 && result.failed.length > 0 ? ' notice-error' : ''}`} role="status">
            <p>Recherche pour {result.scope} : {plural(result.searches, 'recherche')} YouTube, {plural(result.videos, 'vidéo lue', 'vidéos lues')}{result.aiRead > 0 ? `, dont ${result.aiRead} relue${result.aiRead > 1 ? 's' : ''} par l’IA` : ''}, environ {result.units} unités du quota du jour (10 000). {result.found.length === 0 ? 'Aucun nouveau code trouvé.' : `${plural(result.found.length, 'nouveau code', 'nouveaux codes')} en attente :`}</p>
            {result.found.length > 0 && <ul>{result.found.map(item => <li key={`${item.tool}-${item.code}`}><b className="mono">{item.code}</b> pour {item.tool} <span className="muted">({item.creator})</span></li>)}</ul>}
            {result.suggested.length > 0 && <p>{plural(result.suggested.length, 'code')} pour des outils absents du catalogue : {result.suggested.map(item => `${item.code} (${item.tool})`).join(', ')}. <a href="/admin/podcasts?tab=outils">Voir les outils à ajouter</a></p>}
            {result.remaining > 0 && <p>{plural(result.remaining, 'outil')} pas encore cherché{result.remaining > 1 ? 's' : ''} : relance demain pour garder du quota.</p>}
            {result.failed.length > 0 && <p>YouTube n’a pas répondu pour : {result.failed.join(', ')}.</p>}
            <div className="adm-pod-report-actions">
              {result.found.length > 0 && <a href="/admin/verifications" className="adm-btn adm-btn-pri">Ouvrir les vérifications</a>}
              <button type="button" className="adm-btn" onClick={() => setResult(null)}>Fermer</button>
            </div>
          </div>
        )}
        <div className="adm-tabs" role="group" aria-label="Filtre">
          {filters.map(item => <button key={item.value} type="button" className="adm-tab" aria-pressed={filter === item.value} onClick={() => setFilter(item.value)}>{item.label} <span className="adm-tab-n">{countOf(item.value)}</span></button>)}
        </div>
        <div className="adm-toolbar">
          <label htmlFor="category-search" className="sr-only">Rechercher une catégorie</label>
          <input id="category-search" className="adm-search" type="search" placeholder="Rechercher une catégorie…" value={query} onChange={event => setQuery(event.target.value)} />
          <AdminSelect id="category-family-filter" variant="filter" ariaLabel="Famille" value={family} onChange={setFamily} options={familyOptions} searchPlaceholder="Rechercher une famille…" />
          {view !== 'table' && <SortControl sort={sort} id="category-sort" />}
          <span className="adm-count" role="status">{categories.length} sur {countOf(filter)}</span>
          <ViewToggle view={view} onChange={setView} />
        </div>
        <LetterBar sort={sort} />
        {categories.length === 0 ? <div className="adm-empty">Aucune catégorie ne correspond.</div> : view === 'table' ? (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead><tr><SortHeader sort={sort} field="name">Catégorie</SortHeader><SortHeader sort={sort} field="family">Famille</SortHeader><SortHeader sort={sort} field="tools">Outils couverts</SortHeader><SortHeader sort={sort} field="coverage">Couverture</SortHeader><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {categories.map(category => (
                  <tr key={category.slug} data-open onClick={openOnClick(() => setSelectedSlug(category.slug))}>
                    <td className="adm-cell-wrap"><button type="button" className="adm-open adm-open-wrap" title={`Voir le détail de ${category.name}`} onClick={() => setSelectedSlug(category.slug)}><b>{category.name}</b></button></td>
                    <td className={category.family ? undefined : 'adm-cell-muted'}>{category.family ?? 'Sans famille'}</td>
                    <td>{coverage(category)}</td>
                    <td className="adm-cell-muted">{rate(category)} %</td>
                    <td><div className="adm-cell-actions"><a href={`/admin/outils?category=${encodeURIComponent(category.slug)}`}>Outils</a><button type="button" className="adm-btn" onClick={() => open(category)}>Modifier</button></div></td>
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
                <span className="adm-card-meta">{category.family ?? 'Sans famille'}</span>
                <span className="adm-track" role="img" aria-label={`${category.covered} outils couverts sur ${category.tools}`}><span style={{ width: `${rate(category)}%` }} /></span>
                <div className="adm-card-foot">
                  <span className="adm-card-meta">{category.covered} / {category.tools} outil{category.tools > 1 ? 's' : ''} couvert{category.covered > 1 ? 's' : ''}</span>
                  <IconLink icon="list" label="Voir les outils" href={`/admin/outils?category=${encodeURIComponent(category.slug)}`} />
                  <IconButton icon="edit" label="Modifier" onClick={() => open(category)} />
                </div>
              </article>
            ))}
          </div>
        )}
        <AdminDrawer open={selected !== null} onClose={() => setSelectedSlug(null)} label={`Détail de ${selected?.name ?? ''}`} eyebrow="Catégorie" title={selected?.name}
          aside={selected && (selected.covered === 0 ? <StatusDot tone="muted">Vide</StatusDot> : <StatusDot tone="ok">{rate(selected)} %</StatusDot>)}
          actions={selected && <>
            <a className="adm-btn" href={`/admin/outils?category=${encodeURIComponent(selected.slug)}`} title={`Voir les outils de ${selected.name}`}>Outils</a>
            <button type="button" className="adm-btn" disabled={!search.youtube || searching !== null || selected.tools === 0} title={searchTitle ?? `Cherche sur YouTube des codes pour les outils de ${selected.name}, puis pour « ${selected.name} »`} onClick={() => searchCodes(selected)}>{searching === selected.slug ? 'Recherche…' : 'Chercher des codes'}</button>
            <span style={{ flex: 1 }} />
            <button type="button" className="adm-btn adm-btn-pri" onClick={() => open(selected)}>Modifier</button>
          </>}>
          {selected && <>
            {coverage(selected)}
            <DetailList items={[
              { label: 'Famille', value: selected.family ?? 'Sans famille' },
              { label: 'Outils suivis', value: `${selected.tools} outil${selected.tools > 1 ? 's' : ''}` },
              { label: 'Sur le site', value: `${selected.covered} avec un code visible` },
              { label: 'À couvrir', value: `${selected.tools - selected.covered} sans code visible` },
              { label: 'Page publique', value: selected.covered > 0 && <a href={`/categories/${selected.slug}`} target="_blank" rel="noopener noreferrer">/categories/{selected.slug} ↗</a> },
            ]} />
          </>}
        </AdminDrawer>
        <FormDialog open={editing !== null} title={editing === 'new' ? 'Nouvelle catégorie' : `Modifier ${editing?.name ?? ''}`}
          intro={editing === 'new' ? 'Elle apparaîtra sur le site dès qu’un de ses outils aura un code visible.' : 'Son adresse sur le site ne change pas, même si tu la renommes.'}
          onClose={() => setEditing(null)}
          onSubmit={() => editing === 'new' ? sendJson('/api/admin/categories', 'POST', { name, familySlug }) : sendJson(`/api/admin/categories/${(editing as AdminCategory).slug}`, 'PATCH', { name, familySlug })}>
          <div className="field adm-span-2"><label htmlFor="category-name">Nom</label><input id="category-name" value={name} onChange={event => setName(event.target.value)} required maxLength={80} /></div>
          <div className="field adm-span-2"><label htmlFor="category-family">Famille</label><AdminSelect id="category-family" value={familySlug} onChange={setFamilySlug} options={[{ value: '', label: 'Sans famille' }, ...families.map(item => ({ value: item.slug, label: item.name }))]} placeholder="Choisir une famille…" searchPlaceholder="Rechercher une famille…" /></div>
        </FormDialog>
      </div>
    </main>
  );
}
