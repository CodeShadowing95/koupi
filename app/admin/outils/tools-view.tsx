'use client';
// Outils suivis : ceux qui ont un code visible sont publiés sur le site, les autres attendent un code.
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AdminCategory, AdminTool } from '@/lib/catalog-admin';
import { matchesSearch } from '@/lib/admin-search';
import { ViewToggle, useAdminView } from '@/components/admin-view-toggle';
import { Pagination, usePagination } from '@/components/admin-pagination';
import { FormDialog, sendJson } from '@/components/admin-form-dialog';
import { AdminSelect } from '@/components/admin-select';
import { InfoTip } from '@/components/admin-info-tip';
import { LetterBar, SortControl, SortHeader, useAdminSort, type SortField } from '@/components/admin-sort';
import { AdminToolLogo, AdminToolName } from '@/components/admin-tool-logo';
import { IconButton, IconLink, StatusDot } from '@/components/admin-card';
import { ExportMenu } from '@/components/admin-export-menu';
import { AdminDrawer, DetailList, openOnClick } from '@/components/admin-drawer';
import { FetchLogosButton, RefreshLogoButton } from './logos-button';

type Filter = 'all' | 'published' | 'empty' | 'archived';
const filters: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Tous' }, { value: 'published', label: 'Publiés' }, { value: 'empty', label: 'Sans code visible' }, { value: 'archived', label: 'Archivés' },
];
const matches = (tool: AdminTool, filter: Filter) => filter === 'archived' ? tool.archived : !tool.archived && (filter === 'all' || (filter === 'published' ? tool.visible > 0 : tool.visible === 0));
const priorityLabel: Record<number, string> = { 1: '1 · haute', 2: '2', 3: '3 · normale', 4: '4', 5: '5 · basse' };

const sortFields: SortField<AdminTool>[] = [
  { key: 'priority', label: 'Priorité', value: tool => tool.priority },
  { key: 'name', label: 'Nom', value: tool => tool.name, text: true },
  { key: 'category', label: 'Catégorie', value: tool => tool.category, text: true },
  { key: 'codes', label: 'Nombre de codes', value: tool => tool.codes },
];

type Form = { name: string; categorySlug: string; website: string; description: string; priority: number };

export function ToolsView({ tools, categories, missingLogos }: { tools: AdminTool[]; categories: AdminCategory[]; missingLogos: number }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  // Les liens des autres pages ouvrent la liste déjà filtrée (?q=…).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('q')) setQuery(params.get('q') ?? '');
    if (params.get('category')) setCategory(params.get('category') ?? '');
  }, []);
  const [view, setView] = useAdminView();
  const [editing, setEditing] = useState<AdminTool | 'new' | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = tools.find(tool => tool.id === selectedId) ?? null;
  const [form, setForm] = useState<Form>({ name: '', categorySlug: categories[0]?.slug ?? '', website: '', description: '', priority: 3 });
  const filtered = tools.filter(tool => matches(tool, filter) && (!category || tool.categorySlug === category) && matchesSearch([tool.name, tool.category, tool.website, tool.description], query));
  const sort = useAdminSort(filtered, sortFields, 'name');
  const visible = sort.items;
  const { current, goTo, topRef, size, changeSize } = usePagination(visible, `${filter}|${category}|${query}|${sort.resetKey}`);
  const countOf = (value: Filter) => tools.filter(tool => matches(tool, value)).length;

  function open(target: AdminTool | 'new') {
    setForm(target === 'new'
      ? { name: '', categorySlug: categories[0]?.slug ?? '', website: '', description: '', priority: 3 }
      : { name: target.name, categorySlug: target.categorySlug, website: target.website, description: target.description ?? '', priority: target.priority });
    setEditing(target);
  }
  const set = (key: keyof Form) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(value => ({ ...value, [key]: key === 'priority' ? Number(event.target.value) : event.target.value }));
  async function archive(tool: AdminTool) {
    if (!tool.archived && !window.confirm(`Archiver ${tool.name} ? L’outil et ses codes disparaissent du site. Tu pourras le restaurer.`)) return;
    const error = await sendJson(`/api/admin/tools/${tool.id}`, 'PATCH', { archived: !tool.archived });
    if (error) window.alert(error);
    setEditing(null);
    router.refresh();
  }

  const status = (tool: AdminTool) => tool.archived ? <span className="adm-pill adm-pill-bad">Archivé</span>
    : tool.visible > 0 ? <span className="adm-pill adm-pill-ok">Publié</span> : <span className="adm-pill">Sans code</span>;
  const statusDot = (tool: AdminTool) => tool.archived ? <StatusDot tone="bad">Archivé</StatusDot>
    : tool.visible > 0 ? <StatusDot tone="ok">Publié</StatusDot> : <StatusDot tone="muted">Sans code</StatusDot>;
  const codesLink = (tool: AdminTool) => <a href={`/admin/codes?q=${encodeURIComponent(tool.name)}`}>{tool.visible} visible{tool.visible > 1 ? 's' : ''} / {tool.codes}</a>;

  return (
    <main className="adm-page">
      <div className="container">
        <div className="adm-head">
          <div>
            <span className="eyebrow">Catalogue</span>
            <h1>Outils</h1>
            <p>Les outils que Koupi suit. Un outil apparaît sur le site dès qu’il a un code vérifié ou à tester. Priorité 1 : à couvrir en premier.</p>
          </div>
          <div className="adm-head-actions"><FetchLogosButton missing={missingLogos} /><ExportMenu type="outils" /><button type="button" className="adm-btn adm-btn-pri" onClick={() => open('new')}>+ Nouvel outil</button></div>
        </div>
        <div className="adm-tabs" role="group" aria-label="Filtre">
          {filters.map(item => <button key={item.value} type="button" className="adm-tab" aria-pressed={filter === item.value} onClick={() => setFilter(item.value)}>{item.label} <span className="adm-tab-n">{countOf(item.value)}</span></button>)}
        </div>
        <div className="adm-toolbar">
          <label htmlFor="tool-search" className="sr-only">Rechercher un outil</label>
          <input id="tool-search" className="adm-search" type="search" placeholder="Rechercher un outil, une catégorie…" value={query} onChange={event => setQuery(event.target.value)} />
          <AdminSelect id="tool-category-filter" variant="filter" ariaLabel="Catégorie" value={category} onChange={setCategory}
            options={[{ value: '', label: 'Toutes les catégories' }, ...categories.map(item => ({ value: item.slug, label: item.name, hint: `${item.tools} outil${item.tools > 1 ? 's' : ''}` }))]}
            searchPlaceholder="Rechercher une catégorie…" />
          {view !== 'table' && <SortControl sort={sort} id="tool-sort" />}
          <span className="adm-count" role="status">{visible.length} sur {countOf(filter)}</span>
          <ViewToggle view={view} onChange={setView} />
        </div>
        <LetterBar sort={sort} />
        <div ref={topRef} className="adm-list-top" />
        {visible.length === 0 ? <div className="adm-empty">Aucun outil ne correspond.</div> : view === 'table' ? (
          <div className="adm-table-wrap adm-page-enter" key={`table-${current.page}`}>
            <table className="adm-table">
              <thead><tr><SortHeader sort={sort} field="name">Outil</SortHeader><SortHeader sort={sort} field="category">Catégorie</SortHeader><SortHeader sort={sort} field="codes">Codes</SortHeader><SortHeader sort={sort} field="priority">Priorité</SortHeader><th scope="col">Statut</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {current.items.map(tool => (
                  <tr key={tool.id} data-open onClick={openOnClick(() => setSelectedId(tool.id))}>
                    <td className="adm-cell-nowrap"><button type="button" className="adm-open" title={`Voir le détail de ${tool.name}`} onClick={() => setSelectedId(tool.id)}><AdminToolName slug={tool.slug} name={tool.name} /></button></td>
                    <td className="adm-cell-wrap">{tool.category}</td>
                    <td className="adm-cell-nowrap">{codesLink(tool)}</td>
                    <td className="adm-cell-muted">{tool.priority}</td>
                    <td>{status(tool)}</td>
                    <td><div className="adm-cell-actions"><a href={tool.website} target="_blank" rel="noopener noreferrer">Site ↗</a><button type="button" className="adm-btn" onClick={() => open(tool)}>Modifier</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="adm-grid adm-page-enter" key={`grid-${current.page}`}>
            {current.items.map(tool => (
              <article className="adm-card" key={tool.id} data-open onClick={openOnClick(() => setSelectedId(tool.id))}>
                <div className="adm-card-row">
                  <div className="adm-card-id"><AdminToolLogo slug={tool.slug} name={tool.name} /><div><button type="button" className="adm-open" title={`Voir le détail de ${tool.name}`} onClick={() => setSelectedId(tool.id)}><b>{tool.name}</b></button><small title={tool.description ?? undefined}>{tool.category}</small></div></div>
                  {statusDot(tool)}
                </div>
                <div className="adm-card-foot">
                  <span className="adm-card-meta">{codesLink(tool)}</span>
                  <span className="adm-prio" title={`Priorité ${tool.priority}`}>P{tool.priority}</span>
                  <IconLink icon="external" label="Site officiel" href={tool.website} external />
                  <IconButton icon="edit" label="Modifier" onClick={() => open(tool)} />
                </div>
              </article>
            ))}
          </div>
        )}
        <Pagination current={current} onChange={goTo} label="outils" size={size} onSizeChange={changeSize} />

        <AdminDrawer open={selected !== null} onClose={() => setSelectedId(null)} label={`Détail de ${selected?.name ?? ''}`} eyebrow="Outil"
          title={selected && <span className="adm-drawer-name"><AdminToolLogo slug={selected.slug} name={selected.name} />{selected.name}</span>}
          aside={selected && statusDot(selected)}
          actions={selected && <>
            <button type="button" className="adm-btn adm-btn-danger" onClick={() => archive(selected)}>{selected.archived ? 'Restaurer' : 'Archiver'}</button>
            <span style={{ flex: 1 }} />
            <RefreshLogoButton toolId={selected.id} />
            <a className="adm-btn" href={`/admin/codes?q=${encodeURIComponent(selected.name)}`}>Voir ses codes</a>
            <button type="button" className="adm-btn adm-btn-pri" onClick={() => open(selected)}>Modifier</button>
          </>}>
          {selected && <>
            {selected.description && <p className="adm-detail-quote">{selected.description}</p>}
            <DetailList items={[
              { label: 'Catégorie', value: <a href={`/admin/outils?category=${encodeURIComponent(selected.categorySlug)}`}>{selected.category}</a> },
              { label: 'Site officiel', value: <a href={selected.website} target="_blank" rel="noopener noreferrer">{selected.website.replace(/^https?:\/\//, '').replace(/\/$/, '')} ↗</a> },
              { label: 'Codes', value: codesLink(selected) },
              { label: 'Priorité', value: priorityLabel[selected.priority] ?? selected.priority },
              { label: 'Page publique', value: selected.visible > 0 && !selected.archived && <a href={`/tools/${selected.slug}`} target="_blank" rel="noopener noreferrer">/tools/{selected.slug} ↗</a> },
            ]} />
          </>}
        </AdminDrawer>
        <FormDialog
          open={editing !== null}
          title={editing === 'new' ? 'Nouvel outil' : `Modifier ${editing?.name ?? ''}`}
          intro={editing === 'new' ? 'L’outil restera hors du site tant qu’il n’a pas de code vérifié ou à tester.' : 'Son adresse sur le site ne change pas, même si tu le renommes.'}
          onClose={() => setEditing(null)}
          onSubmit={() => editing === 'new' ? sendJson('/api/admin/tools', 'POST', form) : sendJson(`/api/admin/tools/${(editing as AdminTool).id}`, 'PATCH', form)}
          extra={editing && editing !== 'new' ? <button type="button" className="adm-btn adm-btn-danger" onClick={() => archive(editing)}>{editing.archived ? 'Restaurer' : 'Archiver'}</button> : null}>
          <div className="field"><label htmlFor="tool-name">Nom</label><input id="tool-name" value={form.name} onChange={set('name')} required maxLength={120} /></div>
          <div className="field"><label htmlFor="tool-cat">Catégorie</label><AdminSelect id="tool-cat" value={form.categorySlug} onChange={categorySlug => setForm(value => ({ ...value, categorySlug }))} options={categories.map(category => ({ value: category.slug, label: category.name }))} placeholder="Choisir une catégorie…" searchPlaceholder="Rechercher une catégorie…" required /></div>
          <div className="field"><label htmlFor="tool-site">Site officiel</label><input id="tool-site" value={form.website} onChange={set('website')} required maxLength={300} placeholder="exemple.com" /></div>
          <div className="field"><div className="adm-label-row"><label htmlFor="tool-priority">Priorité</label><InfoTip id="tool-priority-help" label="À quoi sert la priorité ?">Sert à classer les outils. 1 : à couvrir en premier, affiché en tête dans l’admin et sur le site. 5 : peut attendre. Par défaut : 3.</InfoTip></div><select id="tool-priority" value={form.priority} onChange={set('priority')}>{[1, 2, 3, 4, 5].map(value => <option key={value} value={value}>{priorityLabel[value]}</option>)}</select></div>
          <div className="field adm-span-2"><label htmlFor="tool-desc">Description (facultative)</label><textarea id="tool-desc" rows={2} value={form.description} onChange={set('description')} maxLength={300} placeholder="Une phrase pour la fiche de l’outil" /><small>Vide : « Les codes promo donnés par les créateurs pour … ».</small></div>
        </FormDialog>
      </div>
    </main>
  );
}
