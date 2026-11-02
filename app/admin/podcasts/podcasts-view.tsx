'use client';
// Podcasts suivis : l'admin cherche un podcast dans Apple Podcasts et le suit. Ses nouveaux épisodes seront lus
// pour trouver des codes, qui arriveront dans Vérifications.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { StatusDot } from '@/components/admin-card';
import { sendJson } from '@/components/admin-form-dialog';
import type { AdminPodcast } from '@/lib/podcasts-admin';
import type { PodcastFeed } from '@/lib/apple-podcasts';
import type { PodcastReadReport } from '@/lib/podcast-read';

const dayFormat = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Paris' });
const day = (iso: string) => dayFormat.format(new Date(iso));

export function PodcastsView({ podcasts, images, starters }: { podcasts: AdminPodcast[]; images: Record<string, string>; starters: string[] }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PodcastFeed[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [report, setReport] = useState<PodcastReadReport | null>(null);
  const followed = new Set(podcasts.map(podcast => podcast.feedId));

  async function search(term: string) {
    const q = term.trim();
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
  const remove = (podcast: AdminPodcast) => {
    if (!window.confirm(`Ne plus suivre « ${podcast.title} » ? Son créateur et ses codes restent.`)) return;
    void act(`${podcast.id}-delete`, () => sendJson(`/api/admin/podcasts/${podcast.id}`, 'DELETE', {}));
  };

  return (
    <main className="adm-page">
      <div className="container">
        <div className="adm-head">
          <div>
            <span className="eyebrow">Modération</span>
            <h1>Podcasts suivis</h1>
            <p>Les podcasts dont Koupi lit les nouveaux épisodes pour trouver des codes promo. Chaque code trouvé arrive dans Vérifications, où tu décides. Suivre un podcast crée aussi son créateur.</p>
          </div>
          <div className="adm-head-actions">
            <button type="button" className="adm-btn adm-btn-pri" disabled={busy !== null || !podcasts.some(podcast => podcast.active)} onClick={() => read()}>{busy === 'read-all' ? 'Lecture des épisodes…' : 'Lire les épisodes maintenant'}</button>
          </div>
        </div>
        {report && (
          <div className="notice adm-pod-report" role="status">
            <p>{report.podcasts} podcast{report.podcasts > 1 ? 's' : ''} lu{report.podcasts > 1 ? 's' : ''}, {report.episodes} épisode{report.episodes > 1 ? 's' : ''} récent{report.episodes > 1 ? 's' : ''}. {report.found.length === 0 ? 'Aucun nouveau code trouvé.' : `${report.found.length} nouveau${report.found.length > 1 ? 'x' : ''} code${report.found.length > 1 ? 's' : ''} en attente :`}</p>
            {report.found.length > 0 && <ul>{report.found.map(item => <li key={`${item.podcast}-${item.tool}-${item.code}`}><b className="mono">{item.code}</b> pour {item.tool} <span className="muted">({item.podcast})</span></li>)}</ul>}
            {report.failed.length > 0 && <p>Pas de réponse d’Apple pour : {report.failed.join(', ')}. Ils seront relus la prochaine fois.</p>}
            <div className="adm-pod-report-actions">
              {report.found.length > 0 && <Link href="/admin/verifications" className="adm-btn adm-btn-pri">Ouvrir les vérifications</Link>}
              <button type="button" className="adm-btn" onClick={() => setReport(null)}>Fermer</button>
            </div>
          </div>
        )}

        <section className="adm-pod-search" aria-labelledby="pod-search-title">
          <h2 id="pod-search-title">Ajouter un podcast</h2>
          <form className="adm-toolbar" onSubmit={event => { event.preventDefault(); void search(query); }}>
            <label htmlFor="pod-q" className="sr-only">Nom du podcast</label>
            <input id="pod-q" className="adm-search" type="search" placeholder="Nom du podcast…" value={query} maxLength={120} onChange={event => setQuery(event.target.value)} />
            <button type="submit" className="adm-btn adm-btn-pri" disabled={searching}>{searching ? 'Recherche…' : 'Chercher'}</button>
          </form>
          <div className="adm-pod-starters">
            <span className="muted">Pour démarrer :</span>
            {starters.map(name => <button key={name} type="button" className="adm-pod-chip" disabled={searching} onClick={() => search(name)}>{name}</button>)}
          </div>
          {results && (results.length === 0 ? <div className="adm-empty">Aucun podcast trouvé dans Apple Podcasts.</div> : (
            <ul className="adm-pod-results">
              {results.map(feed => {
                const already = followed.has(String(feed.id));
                return (
                  <li key={feed.id} className="adm-pod-result">
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

        {error && <div className="notice notice-error" role="alert">{error}</div>}

        <h2 className="adm-pod-title">Suivis <span className="adm-tab-n">{podcasts.length}</span></h2>
        {podcasts.length === 0 ? <div className="adm-empty">Aucun podcast suivi pour l’instant. Cherche-en un ci-dessus, ou clique sur un nom pour démarrer.</div> : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead><tr><th scope="col">Podcast</th><th scope="col">Créateur</th><th scope="col">État</th><th scope="col">Dernière lecture</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {podcasts.map(podcast => (
                  <tr key={podcast.id}>
                    <td className="adm-cell-wrap">
                      <div className="adm-pod-cell">
                        {images[podcast.feedId] ? <img src={images[podcast.feedId]} alt="" width={40} height={40} loading="lazy" /> : <span className="adm-pod-noimg" aria-hidden="true" />}
                        <div><b>{podcast.title}</b><br /><small className="muted">Suivi depuis le {day(podcast.createdAt)}</small></div>
                      </div>
                    </td>
                    <td>{podcast.creatorName ? <Link href={`/admin/createurs?q=${encodeURIComponent(podcast.creatorName)}`}>{podcast.creatorName}</Link> : '—'}</td>
                    <td><StatusDot tone={podcast.active ? 'ok' : 'muted'}>{podcast.active ? 'Lu chaque nuit' : 'En pause'}</StatusDot></td>
                    <td className="adm-cell-muted">{podcast.lastFetchedAt ? day(podcast.lastFetchedAt) : 'Pas encore lu'}</td>
                    <td>
                      <div className="adm-cell-actions">
                        <button type="button" className="adm-btn" disabled={busy !== null} onClick={() => read(podcast)}>{busy === `${podcast.id}-read` ? 'Lecture…' : 'Lire'}</button>
                        <button type="button" className="adm-btn" disabled={busy !== null} onClick={() => toggle(podcast)}>{podcast.active ? 'Mettre en pause' : 'Reprendre'}</button>
                        <button type="button" className="adm-btn" disabled={busy !== null} onClick={() => remove(podcast)}>Ne plus suivre</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
