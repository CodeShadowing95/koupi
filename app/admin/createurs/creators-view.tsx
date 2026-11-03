'use client';
// Créateurs crédités : leurs codes, les outils qu'ils recommandent, et leurs comptes sur les réseaux
// (YouTube, TikTok, Instagram…) qui donnent leur niveau : Repéré, Contrôlé par Koupi, Créateur vérifié.
import { useEffect, useState } from 'react';
import type { AdminCreator } from '@/lib/catalog-admin';
import { CREATOR_BIO_MAX } from '@/lib/creator-bio';
import { matchesSearch } from '@/lib/admin-search';
import { ViewToggle, useAdminView } from '@/components/admin-view-toggle';
import { Pagination, usePagination } from '@/components/admin-pagination';
import { FormDialog, sendJson } from '@/components/admin-form-dialog';
import { LetterBar, SortControl, SortHeader, useAdminSort, type SortField } from '@/components/admin-sort';
import { IconButton, IconLink, StatusDot } from '@/components/admin-card';
import { AdminCreatorAvatar } from '@/components/admin-creator-avatar';
import { ExportMenu } from '@/components/admin-export-menu';
import { AdminDrawer, DetailList, openOnClick } from '@/components/admin-drawer';
import type { AdminCreatorAccount } from '@/lib/creator-accounts-display';
import { CREATOR_LEVEL_LABELS, type CreatorLevel } from '@/lib/verification';
import { CreatorAccountsPanel, LevelDot } from './creator-accounts-panel';
import { LinkChannelsButton } from './link-channels';

type Creator = AdminCreator & { accounts: AdminCreatorAccount[]; level: CreatorLevel };
const LEVEL_ORDER: Record<CreatorLevel, number> = { spotted: 0, checked: 1, verified: 2 };

type Filter = 'all' | 'visible' | 'hidden' | 'tocheck';
const filters: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Tous' }, { value: 'visible', label: 'Sur le site' }, { value: 'hidden', label: 'Sans code visible' }, { value: 'tocheck', label: 'À contrôler' },
];
function matches(creator: Creator, filter: Filter): boolean {
  if (filter === 'visible') return creator.visible > 0;
  if (filter === 'hidden') return creator.visible === 0;
  // Sur le site, mais encore « repéré » : c'est eux qu'il faut contrôler en premier.
  if (filter === 'tocheck') return creator.visible > 0 && creator.level === 'spotted';
  return true;
}

const sortFields: SortField<Creator>[] = [
  { key: 'name', label: 'Nom', value: creator => creator.name, text: true },
  { key: 'level', label: 'Niveau', value: creator => LEVEL_ORDER[creator.level] },
  { key: 'codes', label: 'Nombre de codes', value: creator => creator.codes },
  { key: 'visible', label: 'Codes visibles', value: creator => creator.visible },
];

export function CreatorsView({ creators, youtubeReady }: { creators: Creator[]; youtubeReady: boolean }) {
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  // Les liens des autres pages ouvrent la liste déjà filtrée (?q=…).
  useEffect(() => { const q = new URLSearchParams(window.location.search).get('q'); if (q) setQuery(q); }, []);
  const [view, setView] = useAdminView();
  const [editing, setEditing] = useState<Creator | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = creators.find(creator => creator.id === selectedId) ?? null;
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const filtered = creators.filter(creator => matches(creator, filter) && matchesSearch([creator.name, ...creator.tools], query));
  const sort = useAdminSort(filtered, sortFields, 'name');
  const visible = sort.items;
  const { current, goTo, topRef, size, changeSize } = usePagination(visible, `${filter}|${query}|${sort.resetKey}`);
  const countOf = (value: Filter) => creators.filter(creator => matches(creator, value)).length;
  const open = (creator: Creator) => { setName(creator.name); setBio(creator.bio ?? ''); setEditing(creator); };
  const codesLink = (creator: Creator) => <a href={`/admin/codes?q=${encodeURIComponent(creator.name)}`}>{creator.visible} visible{creator.visible > 1 ? 's' : ''} / {creator.codes}</a>;
  const page = (creator: Creator) => creator.visible > 0 ? <a href={`/creators/${creator.slug}`} target="_blank" rel="noopener noreferrer">Page ↗</a> : null;

  return (
    <main className="adm-page">
      <div className="container">
        <div className="adm-head">
          <div>
            <span className="eyebrow">Catalogue</span>
            <h1>Créateurs</h1>
            <p>Les personnes à qui appartiennent les codes. Un créateur est ajouté automatiquement avec son premier code ; ici, tu corriges son nom, tu relies ses comptes et tu le contrôles.</p>
          </div>
          <div className="adm-head-actions"><LinkChannelsButton missing={creators.filter(creator => !creator.accounts.some(account => account.platform === 'youtube')).length} youtubeReady={youtubeReady} /><ExportMenu type="createurs" /></div>
        </div>
        <div className="adm-tabs" role="group" aria-label="Filtre">
          {filters.map(item => <button key={item.value} type="button" className="adm-tab" aria-pressed={filter === item.value} onClick={() => setFilter(item.value)}>{item.label} <span className="adm-tab-n">{countOf(item.value)}</span></button>)}
        </div>
        <div className="adm-toolbar">
          <label htmlFor="creator-search" className="sr-only">Rechercher un créateur</label>
          <input id="creator-search" className="adm-search" type="search" placeholder="Rechercher un créateur, un outil…" value={query} onChange={event => setQuery(event.target.value)} />
          {view !== 'table' && <SortControl sort={sort} id="creator-sort" />}
          <span className="adm-count" role="status">{visible.length} sur {countOf(filter)}</span>
          <ViewToggle view={view} onChange={setView} />
        </div>
        <LetterBar sort={sort} />
        <div ref={topRef} className="adm-list-top" />
        {visible.length === 0 ? <div className="adm-empty">Aucun créateur ne correspond.</div> : view === 'table' ? (
          <div className="adm-table-wrap adm-page-enter" key={`table-${current.page}`}>
            <table className="adm-table">
              <thead><tr><SortHeader sort={sort} field="name">Créateur</SortHeader><SortHeader sort={sort} field="level">Niveau</SortHeader><SortHeader sort={sort} field="codes">Codes</SortHeader><th scope="col">Outils</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {current.items.map(creator => (
                  <tr key={creator.id} data-open onClick={openOnClick(() => setSelectedId(creator.id))}>
                    <td className="adm-cell-wrap"><span className="adm-cell-id"><AdminCreatorAvatar name={creator.name} small /><button type="button" className="adm-open adm-open-wrap" title={`Voir le détail de ${creator.name}`} onClick={() => setSelectedId(creator.id)}><b>{creator.name}</b></button></span></td>
                    <td className="adm-cell-nowrap"><LevelDot level={creator.level} /></td>
                    <td className="adm-cell-nowrap">{codesLink(creator)}</td>
                    <td className="adm-cell-wrap adm-cell-muted">{creator.tools.join(', ') || '—'}</td>
                    <td><div className="adm-cell-actions">{page(creator)}<button type="button" className="adm-btn" onClick={() => open(creator)}>Modifier</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="adm-grid adm-page-enter" key={`grid-${current.page}`}>
            {current.items.map(creator => (
              <article className="adm-card" key={creator.id} data-open onClick={openOnClick(() => setSelectedId(creator.id))}>
                <div className="adm-card-row">
                  <div className="adm-card-id"><AdminCreatorAvatar name={creator.name} /><div><button type="button" className="adm-open" title={`Voir le détail de ${creator.name}`} onClick={() => setSelectedId(creator.id)}><b>{creator.name}</b></button><small title={creator.tools.join(', ')}>{creator.tools.join(', ') || 'Aucun outil'}</small></div></div>
                  <LevelDot level={creator.level} />
                </div>
                <div className="adm-card-foot">
                  <span className="adm-card-meta">{codesLink(creator)}{creator.visible === 0 && ' · masqué'}</span>
                  {creator.visible > 0 && <IconLink icon="external" label="Page publique" href={`/creators/${creator.slug}`} external />}
                  <IconButton icon="edit" label="Modifier le profil" onClick={() => open(creator)} />
                </div>
              </article>
            ))}
          </div>
        )}
        <Pagination current={current} onChange={goTo} label="créateurs" size={size} onSizeChange={changeSize} />

        <AdminDrawer open={selected !== null} onClose={() => setSelectedId(null)} label={`Détail de ${selected?.name ?? ''}`} eyebrow="Créateur"
          title={selected && <span className="adm-drawer-name"><AdminCreatorAvatar name={selected.name} />{selected.name}</span>}
          aside={selected && (selected.visible > 0 ? <StatusDot tone="ok">Sur le site</StatusDot> : <StatusDot tone="muted">Masqué</StatusDot>)}
          actions={selected && <>
            <a className="adm-btn" href={`/admin/codes?q=${encodeURIComponent(selected.name)}`}>Voir ses codes</a>
            <span style={{ flex: 1 }} />
            <button type="button" className="adm-btn adm-btn-pri" onClick={() => open(selected)}>Modifier le profil</button>
          </>}>
          {selected && <>
            <DetailList items={[
              { label: 'Niveau', value: CREATOR_LEVEL_LABELS[selected.level] },
              { label: 'Présentation', value: selected.bio ? <span style={{ whiteSpace: 'pre-line' }}>{selected.bio}</span> : <span className="muted">Aucune, à écrire pour sa page publique.</span> },
              { label: 'Codes', value: codesLink(selected) },
              { label: 'Page publique', value: selected.visible > 0 && <a href={`/creators/${selected.slug}`} target="_blank" rel="noopener noreferrer">/creators/{selected.slug} ↗</a> },
            ]} />
            <CreatorAccountsPanel creatorId={selected.id} creatorName={selected.name} accounts={selected.accounts} youtubeReady={youtubeReady} />
            <div>
              <span className="eyebrow">Outils recommandés</span>
              {selected.tools.length ? <div className="adm-chips" style={{ marginTop: 8 }}>{selected.tools.map(tool => <a key={tool} href={`/admin/outils?q=${encodeURIComponent(tool)}`}>{tool}</a>)}</div> : <p className="muted">Aucun outil pour l’instant.</p>}
            </div>
          </>}
        </AdminDrawer>
        <FormDialog open={editing !== null} title={`Profil de ${editing?.name ?? ''}`} intro="Le nom et la présentation s’affichent en haut de sa page publique. L’adresse de sa page ne change pas."
          onClose={() => setEditing(null)} onSubmit={() => sendJson(`/api/admin/creators/${editing?.id}`, 'PATCH', { name, bio })}>
          <div className="field adm-span-2"><label htmlFor="creator-name">Nom</label><input id="creator-name" value={name} onChange={event => setName(event.target.value)} required maxLength={160} /></div>
          <div className="field adm-span-2">
            <label htmlFor="creator-bio">Présentation <span className="muted">(facultatif)</span></label>
            <textarea id="creator-bio" rows={4} value={bio} onChange={event => setBio(event.target.value)} maxLength={CREATOR_BIO_MAX} aria-describedby="creator-bio-help" placeholder="Ex. Teste les outils d’IA pour les indépendants, une vidéo par semaine." />
            <small id="creator-bio-help" className="muted">{bio.trim().length} / {CREATOR_BIO_MAX} caractères. Ce qu’il fait et pour qui, en une ou deux phrases.</small>
          </div>
        </FormDialog>
      </div>
    </main>
  );
}
