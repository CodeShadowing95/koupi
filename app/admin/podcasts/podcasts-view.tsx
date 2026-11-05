'use client';
// Podcasts suivis : l'admin cherche un podcast dans Apple Podcasts et le suit. Ses nouveaux épisodes seront lus
// pour trouver des codes, qui arriveront dans Vérifications.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { IconButton, StatusDot } from '@/components/admin-card';
import { Pagination, usePagination } from '@/components/admin-pagination';
import { LetterBar, SortControl, SortHeader, useAdminSort, type SortField } from '@/components/admin-sort';
import { ViewToggle, useAdminView } from '@/components/admin-view-toggle';
import { matchesSearch } from '@/lib/admin-search';
import { sendJson } from '@/components/admin-form-dialog';
import type { AdminPodcast } from '@/lib/podcasts-admin';
import { compareYield, isQuiet, QUIET_DAYS, yieldScore } from '@/lib/podcast-yield';
import { TOP_GENRES, type PodcastFeed } from '@/lib/apple-podcasts';
import type { PodcastReadReport } from '@/lib/podcast-read';
import type { AdminToolSuggestion } from '@/lib/tool-suggestions';
import { openOnClick } from '@/components/admin-drawer';
import type { AdminCandidate } from '@/lib/podcast-candidates';
import { CandidatesPanel } from './candidates-panel';
import { PodcastDrawer } from './podcast-drawer';
import { ToolSuggestionsPanel, type AiAvailability, type CatalogToolOption, type CategoryOption } from './tool-suggestions-panel';

type Filter = 'all' | 'active' | 'paused' | 'never' | 'codes' | 'quiet';
const filters: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Tous' }, { value: 'active', label: 'Lus chaque nuit' }, { value: 'paused', label: 'En pause' },
  { value: 'never', label: 'Jamais lus' }, { value: 'codes', label: 'Avec codes trouvés' }, { value: 'quiet', label: `Rien depuis ${QUIET_DAYS} jours` },
];
const matches = (podcast: AdminPodcast, filter: Filter, now: Date) =>
  filter === 'all' || (filter === 'active' ? podcast.active : filter === 'paused' ? !podcast.active : filter === 'never' ? !podcast.lastFetchedAt
    : filter === 'quiet' ? isQuiet(podcast, now) : podcast.codesFound > 0);

const sortFields: SortField<AdminPodcast>[] = [
  { key: 'title', label: 'Nom', value: podcast => podcast.title, text: true },
  { key: 'followed', label: 'Date de suivi', value: podcast => podcast.createdAt },
  { key: 'read', label: 'Dernière lecture', value: podcast => podcast.lastFetchedAt ?? '' },
  { key: 'codes', label: 'Codes trouvés', value: podcast => podcast.codesFound },
  { key: 'yield', label: 'Rendement', value: yieldScore },
  { key: 'lastCode', label: 'Dernier code', value: podcast => podcast.lastCodeAt ?? '' },
];

const dayFormat = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Paris' });
const day = (iso: string) => dayFormat.format(new Date(iso));

type Panel = 'list' | 'add' | 'candidates' | 'tools';

export function PodcastsView({ podcasts: unsorted, nowIso, images, starters, suggestions, categories, tools, ai, initialTab, candidates }: {
  podcasts: AdminPodcast[]; nowIso: string; images: Record<string, string>; starters: string[]; candidates: AdminCandidate[];
  suggestions: AdminToolSuggestion[]; categories: CategoryOption[]; tools: CatalogToolOption[]; ai: AiAvailability; initialTab?: Panel;
}) {
  const router = useRouter();
  const now = new Date(nowIso);
  // Ordre normal de la liste : du plus rentable au moins rentable.
  const podcasts = [...unsorted].sort(compareYield);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PodcastFeed[] | null>(null);
  const [searching, setSearching] = useState(false);
  /** Genre du classement affiché, null pour une recherche par nom. */
  const [genre, setGenre] = useState<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [report, setReport] = useState<PodcastReadReport | null>(null);
  const followed = new Set(podcasts.map(podcast => podcast.feedId));
  const [panel, setPanel] = useState<Panel>(initialTab ?? (podcasts.length ? 'list' : 'add'));
  const [filter, setFilter] = useState<Filter>('all');
  const [listQuery, setListQuery] = useState('');
  const [view, setView] = useAdminView();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = podcasts.find(podcast => podcast.id === selectedId) ?? null;
  const filtered = podcasts.filter(podcast => matches(podcast, filter, now) && matchesSearch([podcast.title, podcast.creatorName ?? ''], listQuery));
  const sort = useAdminSort(filtered, sortFields, 'title');
  const visible = sort.items;
  const { current, goTo, topRef, size, changeSize } = usePagination(visible, `${filter}|${listQuery}|${sort.resetKey}`);
  // Dans un classement, on garde le rang d'Apple et on masque les podcasts déjà suivis.
  const followedInChart = genre !== null ? (results ?? []).filter(feed => followed.has(String(feed.id))).length : 0;
  const shownResults = (results ?? []).map((feed, index) => ({ feed, rank: genre !== null ? index + 1 : null }))
    .filter(item => genre === null || !followed.has(String(item.feed.id)));
  const countOf = (value: Filter) => podcasts.filter(podcast => matches(podcast, value, now)).length;
  const quietActive = podcasts.filter(podcast => podcast.active && isQuiet(podcast, now));

  // Classement Apple d'un genre : les podcasts déjà suivis sont masqués.
  async function discover(genreId: number) {
    setGenre(genreId);
    setSearching(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/podcasts/top?genre=${genreId}`, { cache: 'no-store' });
      const body = await response.json().catch(() => ({})) as { feeds?: PodcastFeed[]; error?: string };
      if (!response.ok) { setError(body.error ?? 'Le classement n’a pas pu être chargé.'); setResults(null); }
      else setResults(body.feeds ?? []);
    } catch {
      setError('Le classement n’a pas pu être chargé. Vérifie ta connexion.');
    }
    setSearching(false);
  }

  async function search(term: string) {
    const q = term.trim();
    setGenre(null);
    setQuery(term);
    if (q.length < 2) { setError('Tape au moins deux lettres.'); return; }
    setSearching(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/podcasts/search?q=${encodeURIComponent(q)}`, { cache: 'no-store' });
      const body = await response.json().catch(() => ({})) as { feeds?: PodcastFeed[]; error?: string };
      if (!response.ok) { setError(body.error ?? 'La recherche a échoué.'); setResults(null); }
      else setResults(body.feeds ?? []);
    } catch {
      setError('La recherche a échoué. Vérifie ta connexion.');
    }
    setSearching(false);
  }

  async function act(key: string, request: () => Promise<string | null>) {
    setBusy(key);
    setError('');
    const failure = await request();
    setBusy(null);
    if (failure) setError(failure);
    else router.refresh();
  }
  const follow = (feed: PodcastFeed) => act(`follow-${feed.id}`, () => sendJson('/api/admin/podcasts', 'POST', { podcastId: feed.id }));
  const toggle = (podcast: AdminPodcast) => act(`${podcast.id}-toggle`, () => sendJson(`/api/admin/podcasts/${podcast.id}`, 'PATCH', { active: !podcast.active }));
  // Lecture des épisodes récents : de tous les podcasts actifs, ou d'un seul.
  async function read(podcast?: AdminPodcast) {
    setBusy(podcast ? `${podcast.id}-read` : 'read-all');
    setError('');
    setReport(null);
    try {
      const response = await fetch('/api/admin/podcasts/read', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(podcast ? { id: podcast.id } : {}) });
      const body = await response.json().catch(() => ({})) as PodcastReadReport & { error?: string };
      if (!response.ok) setError(body.error ?? 'La lecture a échoué.');
      else { setReport(body); router.refresh(); }
    } catch {
      setError('La lecture a échoué. Vérifie ta connexion.');
    }
    setBusy(null);
  }
  // Met en pause d'un coup les podcasts actifs qui ne donnent plus rien. Ils gardent leur historique et se reprennent un par un.
  async function pauseQuiet() {
    if (!window.confirm(`Mettre en pause ${quietActive.length} podcast${quietActive.length > 1 ? 's' : ''} sans code depuis ${QUIET_DAYS} jours ? Ils ne seront plus lus la nuit, tu pourras les reprendre.`)) return;
    await act('pause-quiet', async () => {
      for (const podcast of quietActive) {
        const failure = await sendJson(`/api/admin/podcasts/${podcast.id}`, 'PATCH', { active: false });
        if (failure) return failure;
      }
      return null;
    });
  }
  const remove = (podcast: AdminPodcast) => {
    if (!window.confirm(`Ne plus suivre « ${podcast.title} » ? Son créateur et ses codes restent.`)) return;
    void act(`${podcast.id}-delete`, () => sendJson(`/api/admin/podcasts/${podcast.id}`, 'DELETE', {}));
  };

  const artwork = (podcast: AdminPodcast, size: number) => images[podcast.feedId]
    ? <img className="adm-pod-art" src={images[podcast.feedId]} alt="" width={size} height={size} loading="lazy" />
    : <span className="adm-pod-art adm-pod-noimg" aria-hidden="true" />;
  const state = (podcast: AdminPodcast) => <StatusDot tone={podcast.active ? 'ok' : 'muted'}>{podcast.active ? 'Lu chaque nuit' : 'En pause'}</StatusDot>;
  const lastRead = (podcast: AdminPodcast) => podcast.lastFetchedAt ? `Lu le ${day(podcast.lastFetchedAt)}` : 'Pas encore lu';
  const creatorLink = (podcast: AdminPodcast) => podcast.creatorName ? <Link href={`/admin/createurs?q=${encodeURIComponent(podcast.creatorName)}`}>{podcast.creatorName}</Link> : '—';
  const codesLink = (podcast: AdminPodcast) => podcast.codesFound
    ? <Link href={`/admin/codes?q=${encodeURIComponent(podcast.creatorName ?? podcast.title)}`}>{podcast.codesFound} code{podcast.codesFound > 1 ? 's' : ''} trouvé{podcast.codesFound > 1 ? 's' : ''}</Link>
    : <span className="muted">Aucun code trouvé</span>;
  const published = (podcast: AdminPodcast) => `${podcast.codesPublished} publié${podcast.codesPublished > 1 ? 's' : ''}`;
  const copies = (podcast: AdminPodcast) => `${podcast.copiesThisMonth} copie${podcast.copiesThisMonth > 1 ? 's' : ''} ce mois-ci`;
  const actions = (podcast: AdminPodcast, compact = false) => <>
    <button type="button" className="adm-btn" disabled={busy !== null} onClick={() => read(podcast)}>{busy === `${podcast.id}-read` ? 'Lecture…' : 'Lire'}</button>
    <button type="button" className="adm-btn" disabled={busy !== null} onClick={() => toggle(podcast)}>{podcast.active ? 'Pause' : 'Reprendre'}</button>
    {compact
      ? <span className="adm-card-push"><IconButton icon="cross" tone="bad" label={`Ne plus suivre ${podcast.title}`} disabled={busy !== null} onClick={() => remove(podcast)} /></span>
      : <button type="button" className="adm-btn" disabled={busy !== null} onClick={() => remove(podcast)}>Ne plus suivre</button>}
  </>;

  return (
    <main className="adm-page">
      <div className="container">
        <div className="adm-head">
          <div>
            <span className="eyebrow">Modération</span>
            <h1>Podcasts suivis</h1>
            <p>Les podcasts dont Merkod lit les nouveaux épisodes pour trouver des codes promo. Chaque code trouvé arrive dans Vérifications, où tu décides. Suivre un podcast crée aussi son créateur.</p>
          </div>
          <div className="adm-head-actions">
            <button type="button" className="adm-btn adm-btn-pri" disabled={busy !== null || !podcasts.some(podcast => podcast.active)} onClick={() => read()}>{busy === 'read-all' ? 'Lecture des épisodes…' : 'Lire les épisodes maintenant'}</button>
          </div>
        </div>
        {report && (
          <div className="notice adm-pod-report" role="status">
            <p>{report.podcasts} podcast{report.podcasts > 1 ? 's' : ''} lu{report.podcasts > 1 ? 's' : ''}, {report.episodes} épisode{report.episodes > 1 ? 's' : ''} récent{report.episodes > 1 ? 's' : ''}{report.aiRead > 0 ? `, dont ${report.aiRead} relu${report.aiRead > 1 ? 's' : ''} par l’IA` : ''}. {report.found.length === 0 ? 'Aucun nouveau code trouvé.' : `${report.found.length} nouveau${report.found.length > 1 ? 'x' : ''} code${report.found.length > 1 ? 's' : ''} en attente :`}</p>
            {report.found.length > 0 && <ul>{report.found.map(item => <li key={`${item.podcast}-${item.tool}-${item.code}`}><b className="mono">{item.code}</b> pour {item.tool} <span className="muted">({item.podcast})</span></li>)}</ul>}
            {report.suggested.length > 0 && <p>{report.suggested.length} code{report.suggested.length > 1 ? 's' : ''} pour des outils absents du catalogue : {report.suggested.map(item => `${item.code} (${item.tool})`).join(', ')}. <button type="button" className="adm-link-btn" onClick={() => setPanel('tools')}>Voir les outils à ajouter</button></p>}
            {report.failed.length > 0 && <p>Pas de réponse d’Apple pour : {report.failed.join(', ')}. Ils seront relus la prochaine fois.</p>}
            <div className="adm-pod-report-actions">
              {report.found.length > 0 && <Link href="/admin/verifications" className="adm-btn adm-btn-pri">Ouvrir les vérifications</Link>}
              <button type="button" className="adm-btn" onClick={() => setReport(null)}>Fermer</button>
            </div>
          </div>
        )}

        <div className="adm-pod-panels" role="tablist" aria-label="Podcasts">
          <button type="button" role="tab" id="pod-tab-list" aria-controls="pod-panel-list" aria-selected={panel === 'list'} className="adm-pod-panel-tab" onClick={() => setPanel('list')}>Suivis <span className="adm-tab-n">{podcasts.length}</span></button>
          <button type="button" role="tab" id="pod-tab-add" aria-controls="pod-panel-add" aria-selected={panel === 'add'} className="adm-pod-panel-tab" onClick={() => setPanel('add')}>+ Ajouter un podcast</button>
          <button type="button" role="tab" id="pod-tab-candidates" aria-controls="pod-panel-candidates" aria-selected={panel === 'candidates'} className="adm-pod-panel-tab" onClick={() => setPanel('candidates')}>Candidats {candidates.some(item => item.status === 'new') && <span className="adm-tab-n">{candidates.filter(item => item.status === 'new').length}</span>}</button>
          <button type="button" role="tab" id="pod-tab-tools" aria-controls="pod-panel-tools" aria-selected={panel === 'tools'} className="adm-pod-panel-tab" onClick={() => setPanel('tools')}>Outils à ajouter {suggestions.length > 0 && <span className="adm-tab-n">{suggestions.length}</span>}</button>
        </div>

        {error && <div className="notice notice-error" role="alert">{error}</div>}

        {panel === 'tools' ? <ToolSuggestionsPanel suggestions={suggestions} categories={categories} tools={tools} ai={ai} /> : panel === 'candidates' ? <CandidatesPanel candidates={candidates} /> : panel === 'add' ? (
          <section className="adm-pod-search" id="pod-panel-add" role="tabpanel" aria-labelledby="pod-tab-add">
            <p className="muted">Cherche un podcast dans l’annuaire Apple Podcasts, ou parcours un classement, puis clique sur <b>Suivre</b>. Il rejoint l’onglet Suivis.</p>
            <form className="adm-toolbar" onSubmit={event => { event.preventDefault(); void search(query); }}>
              <label htmlFor="pod-q" className="sr-only">Nom du podcast</label>
              <input id="pod-q" className="adm-search" type="search" placeholder="Nom du podcast…" value={query} maxLength={120} onChange={event => setQuery(event.target.value)} />
              <button type="submit" className="adm-btn adm-btn-pri" disabled={searching}>{searching ? 'Recherche…' : 'Chercher'}</button>
            </form>
            <div className="adm-pod-starters">
              <span className="muted">Pour démarrer :</span>
              {starters.map(name => <button key={name} type="button" className="adm-pod-chip" disabled={searching} onClick={() => search(name)}>{name}</button>)}
            </div>
            <div className="adm-pod-starters">
              <span className="muted">Découvrir, classement Apple :</span>
              {TOP_GENRES.map(item => <button key={item.id} type="button" className="adm-pod-chip" aria-pressed={genre === item.id} disabled={searching} onClick={() => discover(item.id)}>{item.label}</button>)}
            </div>
            {genre !== null && results && <p className="muted adm-pod-top-note">Les {results.length} premiers en {TOP_GENRES.find(item => item.id === genre)?.label}, rang d’Apple en France.{followedInChart > 0 && ` ${followedInChart === 1 ? 'Celui que tu suis déjà est masqué' : `Les ${followedInChart} que tu suis déjà sont masqués`}.`}</p>}
            {results && (shownResults.length === 0 ? <div className="adm-empty">{genre !== null ? 'Tu suis déjà tous les podcasts de ce classement.' : 'Aucun podcast trouvé dans Apple Podcasts.'}</div> : (
              <ul className="adm-pod-results">
                {shownResults.map(({ feed, rank }) => {
                  const already = followed.has(String(feed.id));
                  return (
                    <li key={feed.id} className="adm-pod-result">
                      {rank !== null && <span className="adm-pod-rank" aria-label={`Rang ${rank}`}>{rank}</span>}
                      {feed.image ? <img src={feed.image} alt="" width={56} height={56} loading="lazy" /> : <span className="adm-pod-noimg" aria-hidden="true" />}
                      <div className="adm-pod-info">
                        <b>{feed.title}</b>
                        <small>{[feed.author, feed.genre, feed.episodeCount ? `${feed.episodeCount} épisodes` : ''].filter(Boolean).join(' · ')}</small>
                      </div>
                      {feed.link && <a href={feed.link} target="_blank" rel="noopener noreferrer" className="adm-btn">Écouter ↗</a>}
                      {already
                        ? <span className="adm-pod-done">Déjà suivi</span>
                        : <button type="button" className="adm-btn adm-btn-pri" disabled={busy !== null} onClick={() => follow(feed)}>{busy === `follow-${feed.id}` ? 'Ajout…' : 'Suivre'}</button>}
                    </li>
                  );
                })}
              </ul>
            ))}
          </section>
        ) : (
          <section id="pod-panel-list" role="tabpanel" aria-labelledby="pod-tab-list">
            {podcasts.length === 0 ? (
              <div className="adm-empty">Aucun podcast suivi pour l’instant. <button type="button" className="adm-btn" onClick={() => setPanel('add')}>Ajouter un podcast</button></div>
            ) : <>
              <div className="adm-tabs" role="group" aria-label="Filtre">
                {filters.map(item => <button key={item.value} type="button" className="adm-tab" aria-pressed={filter === item.value} onClick={() => setFilter(item.value)}>{item.label} <span className="adm-tab-n">{countOf(item.value)}</span></button>)}
              </div>
              {filter === 'quiet' && (
                <div className="notice adm-pod-quiet" role="status">
                  <p>Ces podcasts sont suivis depuis plus de {QUIET_DAYS} jours et n’ont donné aucun code depuis {QUIET_DAYS} jours. Les mettre en pause évite de les relire chaque nuit pour rien : leurs codes et leur historique restent.</p>
                  {quietActive.length > 0
                    ? <button type="button" className="adm-btn" disabled={busy !== null} onClick={pauseQuiet}>{busy === 'pause-quiet' ? 'Mise en pause…' : `Mettre en pause ${quietActive.length === 1 ? 'celui qui est actif' : `les ${quietActive.length} actifs`}`}</button>
                    : <span className="muted">Ils sont déjà tous en pause.</span>}
                </div>
              )}
              <div className="adm-toolbar">
                <label htmlFor="pod-search" className="sr-only">Rechercher un podcast suivi</label>
                <input id="pod-search" className="adm-search" type="search" placeholder="Rechercher un podcast, un créateur…" value={listQuery} onChange={event => setListQuery(event.target.value)} />
                {view !== 'table' && <SortControl sort={sort} id="pod-sort" />}
                <span className="adm-count" role="status">{visible.length} sur {countOf(filter)}</span>
                <ViewToggle view={view} onChange={setView} />
              </div>
              <LetterBar sort={sort} />
              <div ref={topRef} className="adm-list-top" />
              {visible.length === 0 ? <div className="adm-empty">Aucun podcast ne correspond.</div> : view === 'table' ? (
                <div className="adm-table-wrap adm-page-enter" key={`table-${current.page}`}>
                  <table className="adm-table adm-pod-table">
                    <thead><tr><SortHeader sort={sort} field="title">Podcast</SortHeader><th scope="col">Créateur</th><SortHeader sort={sort} field="read">État</SortHeader><SortHeader sort={sort} field="codes">Codes</SortHeader><SortHeader sort={sort} field="yield">Copies du mois</SortHeader><SortHeader sort={sort} field="lastCode">Dernier code</SortHeader><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
                    <tbody>
                      {current.items.map(podcast => (
                        <tr key={podcast.id} data-open onClick={openOnClick(() => setSelectedId(podcast.id))}>
                          <td className="adm-cell-wrap">
                            <div className="adm-pod-cell">
                              {artwork(podcast, 40)}
                              <div><b>{podcast.title}</b><br /><small className="muted">Suivi le {day(podcast.createdAt)}</small></div>
                            </div>
                          </td>
                          <td>{creatorLink(podcast)}</td>
                          <td>{state(podcast)}<br /><small className="muted">{lastRead(podcast)}</small></td>
                          <td className="adm-cell-nowrap">{podcast.codesFound ? <><Link href={`/admin/codes?q=${encodeURIComponent(podcast.creatorName ?? podcast.title)}`}>{podcast.codesFound}</Link> <small className="muted">({published(podcast)})</small></> : <span className="muted">0</span>}</td>
                          <td className="adm-cell-nowrap">{podcast.codesFound ? podcast.copiesThisMonth : <span className="muted">—</span>}</td>
                          <td className="adm-cell-muted adm-cell-nowrap">{podcast.lastCodeAt ? day(podcast.lastCodeAt) : '—'}</td>
                          <td><div className="adm-cell-actions">{actions(podcast, true)}</div></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="adm-grid adm-page-enter" key={`grid-${current.page}`}>
                  {current.items.map(podcast => (
                    <article className="adm-card" key={podcast.id} data-open onClick={openOnClick(() => setSelectedId(podcast.id))}>
                      <div className="adm-card-row">
                        <div className="adm-card-id">{artwork(podcast, 40)}<div><b title={podcast.title}>{podcast.title}</b><small>{podcast.creatorName ?? 'Sans créateur'}</small></div></div>
                      </div>
                      <div className="adm-card-row">{state(podcast)}<span className="adm-card-date">{lastRead(podcast)}</span></div>
                      <p className="adm-card-sub">{codesLink(podcast)}{podcast.codesFound > 0 && <> · {published(podcast)}</>}</p>
                      {podcast.lastCodeAt && <p className="adm-card-sub muted">{copies(podcast)}<br />Dernier code le {day(podcast.lastCodeAt)}</p>}
                      <div className="adm-card-foot">{actions(podcast, true)}</div>
                    </article>
                  ))}
                </div>
              )}
              <Pagination current={current} onChange={goTo} label="podcasts" size={size} onSizeChange={changeSize} />
            </>}
          </section>
        )}
        <PodcastDrawer podcast={selected} image={selected ? images[selected.feedId] : undefined} onClose={() => setSelectedId(null)}
          onShowTools={() => { setSelectedId(null); setPanel('tools'); }}
          state={selected && state(selected)} actions={selected && actions(selected)} />
      </div>
    </main>
  );
}
