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

type Filter = 'all' | 'published' | 'empty' | 'archived';
const filters: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Tous' }, { value: 'published', label: 'Publiés' }, { value: 'empty', label: 'Sans code visible' }, { value: 'archived', label: 'Archivés' },
];
const matches = (tool: AdminTool, filter: Filter) => filter === 'archived' ? tool.archived : !tool.archived && (filter === 'all' || (filter === 'published' ? tool.visible > 0 : tool.visible === 0));
const priorityLabel: Record<number, string> = { 1: '1 · haute', 2: '2 · assez haute', 3: '3 · normale', 4: '4 · assez basse', 5: '5 · basse' };

type Form = { name: string; categorySlug: string; website: string; description: string; priority: number };

export function ToolsView({ tools, categories }: { tools: AdminTool[]; categories: AdminCategory[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  // Les liens des autres pages ouvrent la liste déjà filtrée (?q=…).
  useEffect(() => { const q = new URLSearchParams(window.location.search).get('q'); if (q) setQuery(q); }, []);
  const [view, setView] = useAdminView();
  const [editing, setEditing] = useState<AdminTool | 'new' | null>(null);
  const [form, setForm] = useState<Form>({ name: '', categorySlug: categories[0]?.slug ?? '', website: '', description: '', priority: 3 });
  const visible = tools.filter(tool => matches(tool, filter) && matchesSearch([tool.name, tool.category, tool.website, tool.description], query));
  const { current, goTo, topRef, size, changeSize } = usePagination(visible, `${filter}|${query}`);
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
          <div className="adm-head-actions"><button type="button" className="adm-btn adm-btn-pri" onClick={() => open('new')}>+ Nouvel outil</button></div>
        </div>
        <div className="adm-tabs" role="group" aria-label="Filtre">
          {filters.map(item => <button key={item.value} type="button" className="adm-tab" aria-pressed={filter === item.value} onClick={() => setFilter(item.value)}>{item.label} <span className="adm-tab-n">{countOf(item.value)}</span></button>)}
        </div>
        <div className="adm-toolbar">
          <label htmlFor="tool-search" className="sr-only">Rechercher un outil</label>
          <input id="tool-search" className="adm-search" type="search" placeholder="Rechercher un outil, une catégorie…" value={query} onChange={event => setQuery(event.target.value)} />
          <span className="adm-count" role="status">{visible.length} sur {countOf(filter)}</span>
          <ViewToggle view={view} onChange={setView} />
        </div>
        <div ref={topRef} className="adm-list-top" />
        {visible.length === 0 ? <div className="adm-empty">Aucun outil ne correspond.</div> : view === 'table' ? (
          <div className="adm-table-wrap adm-page-enter" key={`table-${current.page}`}>
            <table className="adm-table">
              <thead><tr><th scope="col">Outil</th><th scope="col">Catégorie</th><th scope="col">Codes</th><th scope="col">Priorité</th><th scope="col">Statut</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {current.items.map(tool => (
                  <tr key={tool.id}>
                    <td className="adm-cell-nowrap"><b>{tool.name}</b></td>
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
              <article className="adm-card" key={tool.id}>
                <div className="adm-card-top"><b>{tool.name}</b>{status(tool)}</div>
                <h3>{tool.category}</h3>
                <p>Codes : {codesLink(tool)} · priorité {tool.priority}</p>
                {tool.description && <p className="adm-note">{tool.description}</p>}
                <div className="adm-card-foot">
                  <a href={tool.website} target="_blank" rel="noopener noreferrer">Site ↗</a>
                  <button type="button" className="adm-btn" style={{ marginLeft: 'auto' }} onClick={() => open(tool)}>Modifier</button>
                </div>
              </article>
            ))}
          </div>
        )}
        <Pagination current={current} onChange={goTo} label="outils" size={size} onSizeChange={changeSize} />

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
