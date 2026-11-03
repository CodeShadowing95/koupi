'use client';
// Outils à ajouter : codes lus dans les podcasts pour des outils absents du catalogue. L'admin ajoute l'outil
// (ou le relie à un outil déjà suivi sous un autre nom) et le code part en attente dans Vérifications, ou ignore.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconButton } from '@/components/admin-card';
import { FormDialog, sendJson } from '@/components/admin-form-dialog';
import { Pagination, usePagination } from '@/components/admin-pagination';
import { AdminSelect } from '@/components/admin-select';
import { matchesSearch } from '@/lib/admin-search';
import type { AdminToolSuggestion } from '@/lib/tool-suggestions';

export type CategoryOption = { slug: string; name: string };
export type CatalogToolOption = { slug: string; name: string; category: string };

type Mode = 'new' | 'existing';
const emptyForm = { name: '', categorySlug: '', website: '', toolSlug: '' };

export function ToolSuggestionsPanel({ suggestions, categories, tools }: { suggestions: AdminToolSuggestion[]; categories: CategoryOption[]; tools: CatalogToolOption[] }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState<AdminToolSuggestion | null>(null);
  const [mode, setMode] = useState<Mode>('new');
  const [form, setForm] = useState(emptyForm);
  const visible = suggestions.filter(item => matchesSearch([item.name, item.domain ?? '', item.code, item.podcastTitle ?? '', item.sourceTitle], query));
  const { current, goTo, topRef, size, changeSize } = usePagination(visible, query);
  // Combien de codes partiront avec cet outil : les autres suggestions du même site (ou du même nom sans site).
  const sameTool = (item: AdminToolSuggestion) => suggestions.filter(other => item.domain ? other.domain === item.domain : !other.domain && other.name.toLowerCase() === item.name.toLowerCase()).length;

  function open(item: AdminToolSuggestion) {
    setMode('new');
    setForm({ name: item.name, categorySlug: '', website: item.domain ? `https://${item.domain}` : '', toolSlug: '' });
    setAdding(item);
  }
  async function ignore(item: AdminToolSuggestion) {
    setBusy(item.id);
    setError('');
    const failure = await sendJson(`/api/admin/tool-suggestions/${item.id}`, 'POST', { action: 'ignore' });
    setBusy(null);
    if (failure) setError(failure);
    else router.refresh();
  }
  const submit = () => {
    if (!adding) return Promise.resolve(null);
    if (mode === 'existing') return form.toolSlug ? sendJson(`/api/admin/tool-suggestions/${adding.id}`, 'POST', { action: 'add', toolSlug: form.toolSlug }) : Promise.resolve('Choisis un outil du catalogue.');
    return sendJson(`/api/admin/tool-suggestions/${adding.id}`, 'POST', { action: 'add', newTool: { name: form.name, categorySlug: form.categorySlug, website: form.website } });
  };
  const set = (key: keyof typeof emptyForm) => (event: React.ChangeEvent<HTMLInputElement>) => setForm(value => ({ ...value, [key]: event.target.value }));
  const count = adding ? sameTool(adding) : 0;

  return (
    <section id="pod-panel-tools" role="tabpanel" aria-labelledby="pod-tab-tools">
      <p className="muted adm-sugg-intro">Des codes lus dans les podcasts pour des outils qui ne sont pas encore dans le catalogue. Ajoute l’outil et le code part dans Vérifications, ou ignore-le : il ne reviendra pas.</p>
      {error && <div className="notice notice-error" role="alert">{error}</div>}
      {suggestions.length === 0 ? <div className="adm-empty">Aucun outil à ajouter. Les codes d’outils inconnus trouvés à la prochaine lecture apparaîtront ici.</div> : <>
        <div className="adm-toolbar">
          <label htmlFor="sugg-search" className="sr-only">Rechercher un outil à ajouter</label>
          <input id="sugg-search" className="adm-search" type="search" placeholder="Rechercher un outil, un code, un podcast…" value={query} onChange={event => setQuery(event.target.value)} />
          <span className="adm-count" role="status">{visible.length} sur {suggestions.length}</span>
        </div>
        <div ref={topRef} className="adm-list-top" />
        {visible.length === 0 ? <div className="adm-empty">Aucune suggestion ne correspond.</div> : (
          <div className="adm-grid adm-page-enter" key={`sugg-${current.page}`}>
            {current.items.map(item => (
              <article className="adm-card adm-sugg" key={item.id}>
                <div className="adm-card-row">
                  <div className="adm-sugg-tool">
                    <b title={item.name}>{item.name}</b>
                    {item.domain ? <a href={`https://${item.domain}`} target="_blank" rel="noopener noreferrer">{item.domain} ↗</a> : <small className="muted">Site à trouver</small>}
                  </div>
                  <span className="adm-sugg-code mono">{item.code}</span>
                </div>
                <p className="adm-card-sub">{item.discount}</p>
                <p className="adm-sugg-evidence">« {item.evidence} »</p>
                <p className="adm-card-sub"><a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" title={item.sourceTitle}>{item.podcastTitle ?? 'Podcast'} · {item.sourceTitle} ↗</a></p>
                <div className="adm-card-foot">
                  <button type="button" className="adm-btn adm-btn-pri" disabled={busy !== null} onClick={() => open(item)}>Ajouter l’outil</button>
                  <span className="adm-card-push"><IconButton icon="cross" tone="bad" label={`Ignorer le code ${item.code} de ${item.name}`} disabled={busy !== null} onClick={() => ignore(item)} /></span>
                </div>
              </article>
            ))}
          </div>
        )}
        <Pagination current={current} onChange={goTo} label="outils à ajouter" size={size} onSizeChange={changeSize} />
      </>}

      <FormDialog
        open={adding !== null}
        title={`Ajouter ${adding?.name ?? 'l’outil'}`}
        intro={count > 1 ? `${count} codes trouvés pour cet outil partiront en attente dans Vérifications.` : `Le code ${adding?.code ?? ''} partira en attente dans Vérifications.`}
        submitLabel={mode === 'new' ? 'Ajouter l’outil' : 'Relier le code'}
        onClose={() => setAdding(null)}
        onSubmit={submit}>
        <div className="field adm-span-2">
          <div className="adm-tabs" role="group" aria-label="Outil">
            <button type="button" className="adm-tab" aria-pressed={mode === 'new'} onClick={() => setMode('new')}>Nouvel outil</button>
            <button type="button" className="adm-tab" aria-pressed={mode === 'existing'} onClick={() => setMode('existing')}>Déjà dans le catalogue</button>
          </div>
        </div>
        {mode === 'new' ? <>
          <div className="field"><label htmlFor="sugg-name">Nom</label><input id="sugg-name" value={form.name} onChange={set('name')} required maxLength={120} /></div>
          <div className="field"><label htmlFor="sugg-cat">Catégorie</label><AdminSelect id="sugg-cat" value={form.categorySlug} onChange={categorySlug => setForm(value => ({ ...value, categorySlug }))} options={categories.map(category => ({ value: category.slug, label: category.name }))} placeholder="Choisir une catégorie…" searchPlaceholder="Rechercher une catégorie…" required /></div>
          <div className="field adm-span-2"><label htmlFor="sugg-site">Site officiel</label><input id="sugg-site" value={form.website} onChange={set('website')} required maxLength={300} placeholder="exemple.com" /><small>Vérifie que c’est bien le site de l’outil, pas un lien de suivi.</small></div>
        </> : (
          <div className="field adm-span-2"><label htmlFor="sugg-tool">Outil du catalogue</label><AdminSelect id="sugg-tool" value={form.toolSlug} onChange={toolSlug => setForm(value => ({ ...value, toolSlug }))} options={tools.map(tool => ({ value: tool.slug, label: tool.name, hint: tool.category }))} placeholder="Choisir un outil…" searchPlaceholder="Rechercher un outil…" required /><small>Quand l’outil existe déjà sous un autre nom ou un autre site.</small></div>
        )}
      </FormDialog>
    </section>
  );
}
