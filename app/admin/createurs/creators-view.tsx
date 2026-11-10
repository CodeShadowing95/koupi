'use client';
// Créateurs crédités : leurs codes, les outils qu'ils recommandent, et leurs comptes sur les réseaux
// (YouTube, TikTok, Instagram…) qui donnent leur niveau : Repéré, Contrôlé par Merkod, Créateur vérifié.
import { useEffect, useState, type ChangeEvent } from 'react';
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
import type { CreatorLevel } from '@/lib/verification';
import { CreatorAccountsPanel, LevelDot } from './creator-accounts-panel';
import { LinkAccountsButton } from './link-accounts';
import { FetchAvatarsButton, RefreshAvatarButton } from './avatars-button';
import { RefreshButton } from '@/components/admin-refresh-button';
import { RefreshAccountsButton } from './refresh-accounts-button';
import { ChannelWatchButtons } from './channel-watch-buttons';
import { creatorLocale, localeLabel, localeShort } from '@/lib/creator-locale';
import { creatorTodos, type CreatorTab } from '@/lib/creator-todo';
import {
  AUDIENCE_FILTERS, LANGUAGE_FILTERS, NO_FILTERS, PLATFORM_FILTERS, activeFilters, audienceShort, contactOrder, creatorRatings, creatorSubscribers,
  isToContact, matchesFilters, type CreatorFilters,
} from '@/lib/creator-admin-filter';
import { routes } from '@/lib/routes';

type Creator = AdminCreator & { accounts: AdminCreatorAccount[]; level: CreatorLevel; copies: number; inTouch: boolean };
const dayFormat = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Paris' });
const day = (iso: string) => dayFormat.format(new Date(iso));
const LEVEL_ORDER: Record<CreatorLevel, number> = { spotted: 0, checked: 1, verified: 2 };

type Filter = 'all' | 'visible' | 'hidden' | 'tocheck' | 'belowthreshold' | 'tocontact';
const filters: { value: Filter; label: string; hint?: string }[] = [
  { value: 'all', label: 'Tous' }, { value: 'visible', label: 'Sur le site' }, { value: 'hidden', label: 'Sans code visible' },
  { value: 'tocheck', label: 'À contrôler', hint: 'Sur le site, et aucun de ses comptes n’a encore la case « J’ai contrôlé ce compte » cochée.' },
  { value: 'belowthreshold', label: 'Contrôlés, sous le seuil', hint: 'Tu as déjà contrôlé un de ses comptes, mais son audience reste sous le seuil : il reste « Repéré » sur le site. Rien à faire de plus pour l’instant.' },
  { value: 'tocontact', label: 'À contacter' },
];
/** Au moins un compte coché « J'ai contrôlé ce compte ». */
const adminChecked = (creator: Creator) => creator.accounts.some(account => account.adminCheckedAt);
function matches(creator: Creator, filter: Filter): boolean {
  if (filter === 'visible') return creator.visible > 0;
  if (filter === 'hidden') return creator.visible === 0;
  // Sur le site, et aucun compte contrôlé par l'admin : c'est eux qu'il faut regarder en premier.
  if (filter === 'tocheck') return creator.visible > 0 && creator.level === 'spotted' && !adminChecked(creator);
  // Déjà contrôlés à la main, mais restés « repérés » faute d'audience (seuil d'abonnés ou de notes).
  if (filter === 'belowthreshold') return creator.visible > 0 && creator.level === 'spotted' && adminChecked(creator);
  // Sur le site sans nous connaître encore : à qui proposer de revendiquer sa page.
  if (filter === 'tocontact') return isToContact(creator);
  return true;
}

const sortFields: SortField<Creator>[] = [
  { key: 'name', label: 'Nom', value: creator => creator.name, text: true },
  { key: 'level', label: 'Niveau', value: creator => LEVEL_ORDER[creator.level] },
  { key: 'codes', label: 'Nombre de codes', value: creator => creator.codes },
  { key: 'visible', label: 'Codes visibles', value: creator => creator.visible },
  { key: 'audience', label: 'Abonnés', value: creator => creatorSubscribers(creator.accounts) ?? -1 },
  { key: 'ratings', label: 'Notes (podcast)', value: creator => creatorRatings(creator.accounts) ?? -1 },
  { key: 'copies', label: 'Copies du mois', value: creator => creator.copies },
  { key: 'created', label: 'Date d’ajout', value: creator => Date.parse(creator.createdAt) },
  { key: 'lastCode', label: 'Dernier code', value: creator => creator.lastCodeAt ? Date.parse(creator.lastCodeAt) : null },
];

export function CreatorsView({ creators, toLink, missingPhotos, followed, youtubeReady, ai }: {
  creators: Creator[]; toLink: number; missingPhotos: number; followed: number; youtubeReady: boolean;
  /** État de l'IA, pour « ✦ Trouver ses réseaux ». */
  ai: { active: boolean; label: string };
}) {
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  // Les liens des autres pages ouvrent la liste déjà filtrée (?q=…).
  useEffect(() => { const q = new URLSearchParams(window.location.search).get('q'); if (q) setQuery(q); }, []);
  const [view, setView] = useAdminView();
  const [editing, setEditing] = useState<Creator | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = creators.find(creator => creator.id === selectedId) ?? null;
  // Onglet du panneau : on revient sur l'aperçu à chaque créateur ouvert.
  const [tab, setTab] = useState<CreatorTab>('overview');
  useEffect(() => { setTab('overview'); }, [selectedId]);
  const [removing, setRemoving] = useState<Creator | null>(null);
  const [confirmName, setConfirmName] = useState('');
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [extra, setExtra] = useState<CreatorFilters>(NO_FILTERS);
  const setOne = (key: keyof CreatorFilters) => (event: ChangeEvent<HTMLSelectElement>) => setExtra(current => ({ ...current, [key]: event.target.value }));
  const filtered = creators.filter(creator => matches(creator, filter) && matchesFilters(creator, extra) && matchesSearch([creator.name, ...creator.tools], query));
  // « À contacter » s'ouvre rangé par potentiel ; un tri choisi passe devant.
  if (filter === 'tocontact') filtered.sort(contactOrder);
  const sort = useAdminSort(filtered, sortFields, 'name');
  const extraKey = Object.values(extra).join(',');
  const visible = sort.items;
  const { current, goTo, topRef, size, changeSize } = usePagination(visible, `${filter}|${extraKey}|${query}|${sort.resetKey}`);
  const countOf = (value: Filter) => creators.filter(creator => matches(creator, value) && matchesFilters(creator, extra)).length;
  const open = (creator: Creator) => { setName(creator.name); setBio(creator.bio ?? ''); setEditing(creator); };
  const codesLink = (creator: Creator) => <a href={`/admin/codes?q=${encodeURIComponent(creator.name)}`}>{creator.visible} visible{creator.visible > 1 ? 's' : ''} / {creator.codes}</a>;
  const page = (creator: Creator) => creator.visible > 0 ? <a href={routes.creator(creator.slug)} target="_blank" rel="noopener noreferrer">Page ↗</a> : null;

  return (
    <main className="adm-page">
      <div className="container">
        <div className="adm-head">
          <div>
            <span className="eyebrow">Catalogue</span>
            <h1>Créateurs</h1>
            <p>Les personnes à qui appartiennent les codes. Un créateur est ajouté automatiquement avec son premier code ; ici, tu corriges son nom, tu relies ses comptes et tu le contrôles.</p>
          </div>
          <div className="adm-head-actions"><RefreshButton /><ExportMenu type="createurs" /></div>
        </div>
        <section className="adm-maint adm-maint-tools" aria-label="Entretien des comptes">
          <div className="adm-maint-group">
            <span className="adm-maint-label">Comptes</span>
            <div className="adm-maint-actions"><LinkAccountsButton toLink={toLink} youtubeReady={youtubeReady} /><RefreshAccountsButton accounts={creators.reduce((sum, creator) => sum + creator.accounts.filter(account => account.platform === 'youtube' || account.platform === 'podcast').length, 0)} /><FetchAvatarsButton missing={missingPhotos} youtubeReady={youtubeReady} /></div>
          </div>
          <div className="adm-maint-group">
            <span className="adm-maint-label">Vidéos YouTube</span>
            <div className="adm-maint-actions"><ChannelWatchButtons followed={followed} youtubeReady={youtubeReady} /></div>
          </div>
        </section>
        <div className="adm-tabs" role="group" aria-label="Filtre">
          {filters.map(item => <button key={item.value} type="button" className="adm-tab" aria-pressed={filter === item.value} title={item.hint} onClick={() => setFilter(item.value)}>{item.label} <span className="adm-tab-n">{countOf(item.value)}</span></button>)}
        </div>
        <div className="adm-toolbar">
          <label htmlFor="creator-search" className="sr-only">Rechercher un créateur</label>
          <input id="creator-search" className="adm-search" type="search" placeholder="Rechercher un créateur, un outil…" value={query} onChange={event => setQuery(event.target.value)} />
          <div className="adm-toolbar-end">
            <span className="adm-count" role="status">{visible.length} sur {countOf(filter)}</span>
            <ViewToggle view={view} onChange={setView} />
          </div>
        </div>
        {/* Deuxième rangée : les filtres et le tri, pour que la recherche, le nombre et la vue restent sur une ligne. */}
        <div className="adm-toolbar adm-toolbar-filters">
          <label htmlFor="creator-platform" className="sr-only">Réseau</label>
          <select id="creator-platform" className="adm-filter-select" value={extra.platform} onChange={setOne('platform')}>{PLATFORM_FILTERS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
          <label htmlFor="creator-language" className="sr-only">Langue</label>
          <select id="creator-language" className="adm-filter-select" value={extra.language} onChange={setOne('language')}>{LANGUAGE_FILTERS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
          <label htmlFor="creator-audience" className="sr-only">Audience</label>
          <select id="creator-audience" className="adm-filter-select" value={extra.audience} onChange={setOne('audience')}>{AUDIENCE_FILTERS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
          {activeFilters(extra) > 0 && <button type="button" className="adm-btn" onClick={() => setExtra(NO_FILTERS)}>Effacer les filtres</button>}
          {view !== 'table' && <SortControl sort={sort} id="creator-sort" />}
        </div>
        {filter === 'tocontact' && <p className="adm-hint">Sur le site, sans compte prouvé, sans espace créateur ni revendication en cours. Les plus copiés et les plus suivis d’abord : propose-leur de revendiquer leur page.</p>}
        <LetterBar sort={sort} />
        <div ref={topRef} className="adm-list-top" />
        {visible.length === 0 ? <div className="adm-empty">Aucun créateur ne correspond.</div> : view === 'table' ? (
          <div className="adm-table-wrap adm-page-enter" key={`table-${current.page}`}>
            <table className="adm-table">
              <thead><tr><SortHeader sort={sort} field="name">Créateur</SortHeader><SortHeader sort={sort} field="level">Niveau</SortHeader><SortHeader sort={sort} field="codes">Codes</SortHeader><SortHeader sort={sort} field="audience">Audience</SortHeader><SortHeader sort={sort} field="copies">Copies</SortHeader><SortHeader sort={sort} field="created">Ajouté le</SortHeader><th scope="col">Langue</th><th scope="col">Outils</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {current.items.map(creator => (
                  <tr key={creator.id} data-open onClick={openOnClick(() => setSelectedId(creator.id))}>
                    <td className="adm-cell-wrap"><span className="adm-cell-id"><AdminCreatorAvatar name={creator.name} small /><button type="button" className="adm-open adm-open-wrap" title={`Voir le détail de ${creator.name}`} onClick={() => setSelectedId(creator.id)}><b>{creator.name}</b></button></span></td>
                    <td className="adm-cell-nowrap"><LevelDot level={creator.level} /></td>
                    <td className="adm-cell-nowrap">{codesLink(creator)}</td>
                    <td className="adm-cell-nowrap">{audienceShort(creator.accounts) ?? <span className="muted">—</span>}</td>
                    <td className="adm-cell-nowrap" title="Copies de ses codes ce mois-ci">{creator.copies}</td>
                    <td className="adm-cell-nowrap" title={creator.lastCodeAt ? `Dernier code le ${day(creator.lastCodeAt)}` : 'Aucun code'}>{day(creator.createdAt)}</td>
                    <td className="adm-cell-nowrap" title={localeLabel(creatorLocale(creator.accounts)) ?? 'Inconnue'}>{localeShort(creatorLocale(creator.accounts)) ?? <span className="muted">—</span>}</td>
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
                  <span className="adm-card-meta">{codesLink(creator)}{creator.visible === 0 && ' · masqué'}{audienceShort(creator.accounts) && ` · ${audienceShort(creator.accounts)}`}{creator.copies > 0 && ` · ${creator.copies} copie${creator.copies > 1 ? 's' : ''}`}{localeShort(creatorLocale(creator.accounts)) && <span title={localeLabel(creatorLocale(creator.accounts)) ?? ''}> · {localeShort(creatorLocale(creator.accounts))}</span>}</span>
                  {creator.visible > 0 && <IconLink icon="external" label="Page publique" href={routes.creator(creator.slug)} external />}
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
            <button type="button" className="adm-btn adm-btn-danger" onClick={() => { setConfirmName(''); setRemoving(selected); }}>Supprimer</button>
            <span style={{ flex: 1 }} />
            <button type="button" className="adm-btn adm-btn-pri" onClick={() => open(selected)}>Modifier le profil</button>
          </>}>
          {selected && <>
            <div className="adm-tabs adm-drawer-tabs" role="tablist" aria-label={`Fiche de ${selected.name}`}>
              {([['overview', 'Aperçu'], ['accounts', `Comptes${selected.accounts.length ? ` (${selected.accounts.length})` : ''}`], ['trust', 'Confiance']] as const).map(([value, label]) => (
                <button key={value} type="button" role="tab" className="adm-tab" aria-selected={tab === value} aria-pressed={tab === value} onClick={() => setTab(value)}>{label}</button>
              ))}
            </div>
            {tab === 'overview' && <>
              {creatorTodos(selected).length > 0 && (
                <div className="adm-todo-box">
                  <span className="eyebrow">À faire</span>
                  <ul>{creatorTodos(selected).map(todo => (
                    <li key={todo.text}><button type="button" className="adm-link-btn" onClick={() => todo.tab === 'profile' ? open(selected) : setTab(todo.tab)}>{todo.text} →</button></li>
                  ))}</ul>
                </div>
              )}
              <DetailList items={[
                { label: 'Niveau', value: <LevelDot level={selected.level} /> },
                { label: 'Codes', value: codesLink(selected) },
                { label: 'Copies ce mois-ci', value: selected.copies },
                { label: 'Audience', value: audienceShort(selected.accounts) ?? <span className="muted">Inconnue</span> },
                { label: 'Pays et langue', value: localeLabel(creatorLocale(selected.accounts)) ?? <span className="muted">Inconnus</span> },
                { label: 'Page publique', value: selected.visible > 0 ? <a href={routes.creator(selected.slug)} target="_blank" rel="noopener noreferrer">/@{selected.slug} ↗</a> : <span className="muted">Pas encore : aucun code visible.</span> },
              ]} />
              <div>
                <span className="eyebrow">Présentation</span>
                {selected.bio ? <p style={{ whiteSpace: 'pre-line', margin: '6px 0 0' }}>{selected.bio}</p> : <p className="muted" style={{ margin: '6px 0 0' }}>Aucune. Elle s’affiche en haut de sa page publique : « Modifier le profil ».</p>}
              </div>
              <div>
                <span className="eyebrow">Outils recommandés</span>
                {selected.tools.length ? <div className="adm-chips" style={{ marginTop: 8 }}>{selected.tools.map(tool => <a key={tool} href={`/admin/outils?q=${encodeURIComponent(tool)}`}>{tool}</a>)}</div> : <p className="muted">Aucun outil pour l’instant.</p>}
              </div>
            </>}
            {tab !== 'overview' && <CreatorAccountsPanel creatorId={selected.id} creatorName={selected.name} accounts={selected.accounts} youtubeReady={youtubeReady} ai={ai} mode={tab}
              extra={<div className="adm-ca-photo"><span className="muted">Photo du créateur : celle de sa chaîne YouTube, ou la pochette de son podcast.</span><RefreshAvatarButton creatorId={selected.id} source={selected.accounts.some(account => account.platform === 'youtube' && Boolean(account.externalId)) ? 'youtube' : selected.accounts.some(account => account.platform === 'podcast' && Boolean(account.externalId)) ? 'podcast' : null} youtubeReady={youtubeReady} /></div>} />}
          </>}
        </AdminDrawer>
        <FormDialog open={removing !== null} title={`Supprimer ${removing?.name ?? ''}`} submitLabel="Supprimer pour de bon"
          intro={<>Quand un créateur demande à ne plus figurer sur Merkod. Tout est effacé, sans retour possible : sa page et sa page Black Friday, ses {removing?.codes ?? 0} code{(removing?.codes ?? 0) > 1 ? 's' : ''} et leur historique, ses liens d’offre, ses comptes reliés, sa photo, les chaînes suivies pour lui et son accès au studio. Les outils restent, car d’autres créateurs peuvent y avoir des codes.</>}
          danger onClose={() => setRemoving(null)}
          onSubmit={() => sendJson(`/api/admin/creators/${removing?.id}`, 'DELETE', { confirmName })}>
          <div className="field adm-span-2">
            <label htmlFor="creator-delete-name">Tape <b>{removing?.name}</b> pour confirmer</label>
            <input id="creator-delete-name" value={confirmName} onChange={event => setConfirmName(event.target.value)} required autoComplete="off" spellCheck={false} />
          </div>
        </FormDialog>
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
