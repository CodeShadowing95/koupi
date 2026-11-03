'use client';
// Détail d'un podcast suivi : ses derniers épisodes, lesquels Koupi a lus, et ce qui a été trouvé dans chacun.
import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { AdminDrawer, DetailList } from '@/components/admin-drawer';
import type { AdminPodcast } from '@/lib/podcasts-admin';
import type { HistoryCode, HistorySuggestion, PodcastHistory } from '@/lib/podcast-history';

const dayFormat = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Paris' });
const day = (iso: string) => dayFormat.format(new Date(iso));
const codeStatus: Record<HistoryCode['status'], string> = { pending: 'En attente', to_test: 'À tester', verified: 'Vérifié', rejected: 'Rejeté' };
const suggestionStatus: Record<HistorySuggestion['status'], string> = { open: 'Outil à ajouter', added: 'Outil ajouté', ignored: 'Ignoré' };

export function PodcastDrawer({ podcast, image, onClose, onShowTools, state, actions }: {
  podcast: AdminPodcast | null; image?: string; onClose: () => void; onShowTools: () => void; state: ReactNode; actions: ReactNode;
}) {
  const [history, setHistory] = useState<PodcastHistory | null>(null);
  const [error, setError] = useState('');
  const id = podcast?.id;
  const lastFetchedAt = podcast?.lastFetchedAt;

  // Relu à l'ouverture, et après une lecture (la date de dernière lecture change).
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setHistory(null);
    setError('');
    fetch(`/api/admin/podcasts/${id}/history`, { cache: 'no-store' })
      .then(async response => {
        const body = await response.json().catch(() => ({})) as PodcastHistory & { error?: string };
        if (cancelled) return;
        if (!response.ok) setError(body.error ?? 'Impossible de charger les épisodes.');
        else setHistory(body);
      })
      .catch(() => { if (!cancelled) setError('Impossible de charger les épisodes. Vérifie ta connexion.'); });
    return () => { cancelled = true; };
  }, [id, lastFetchedAt]);

  return (
    <AdminDrawer open={podcast !== null} onClose={onClose} label={`Détail de ${podcast?.title ?? ''}`} eyebrow="Podcast suivi"
      title={podcast && <span className="adm-drawer-name">{image ? <img className="adm-pod-art" src={image} alt="" width={40} height={40} /> : <span className="adm-pod-art adm-pod-noimg" aria-hidden="true" />}{podcast.title}</span>}
      aside={state} actions={actions}>
      {podcast && <>
        <DetailList items={[
          { label: 'Créateur', value: podcast.creatorName && <Link href={`/admin/createurs?q=${encodeURIComponent(podcast.creatorName)}`}>{podcast.creatorName}</Link> },
          { label: 'Suivi depuis', value: day(podcast.createdAt) },
          { label: 'Dernière lecture', value: podcast.lastFetchedAt ? day(podcast.lastFetchedAt) : 'Pas encore lu' },
          { label: 'Codes trouvés', value: podcast.codesFound ? <Link href={`/admin/codes?q=${encodeURIComponent(podcast.creatorName ?? podcast.title)}`}>{podcast.codesFound} code{podcast.codesFound > 1 ? 's' : ''}</Link> : 'Aucun' },
          { label: 'Apple Podcasts', value: <a href={`https://podcasts.apple.com/podcast/id${podcast.feedId}`} target="_blank" rel="noopener noreferrer">Écouter ↗</a> },
        ]} />
        <section className="adm-pod-history" aria-label="Derniers épisodes">
          <h3>Derniers épisodes</h3>
          {error && <div className="notice notice-error" role="alert">{error}</div>}
          {!history && !error && <p className="muted">Chargement des épisodes…</p>}
          {history && (history.episodes.length === 0 ? <p className="muted">Aucun épisode dans Apple Podcasts.</p> : (
            <ol className="adm-pod-episodes">
              {history.episodes.map(episode => (
                <li key={episode.id} className={episode.read ? 'is-read' : undefined}>
                  <div className="adm-pod-ep-head">
                    <a href={episode.link} target="_blank" rel="noopener noreferrer" title={episode.title}>{episode.title} ↗</a>
                    <span className={episode.read ? 'adm-pod-ep-read' : 'adm-pod-ep-unread'}>{episode.read ? 'Lu' : 'Pas lu'}</span>
                  </div>
                  <small className="muted">{episode.publishedAt ? day(episode.publishedAt) : 'Date inconnue'}</small>
                  {episode.codes.length + episode.suggestions.length > 0 ? (
                    <ul className="adm-pod-ep-codes">
                      {episode.codes.map(code => (
                        <li key={code.id}>
                          <Link href={`/admin/codes?q=${encodeURIComponent(code.code)}`} className="mono">{code.code}</Link> pour {code.tool}
                          <span className="muted"> · {code.archived ? 'Archivé' : codeStatus[code.status]}</span>
                        </li>
                      ))}
                      {episode.suggestions.map(item => (
                        <li key={item.id}>
                          <span className="mono">{item.code}</span> pour {item.name}
                          <span className="muted"> · </span>
                          {item.status === 'open' ? <button type="button" className="adm-link-btn" onClick={onShowTools}>{suggestionStatus.open}</button> : <span className="muted">{suggestionStatus[item.status]}</span>}
                        </li>
                      ))}
                    </ul>
                  ) : episode.read && <p className="adm-pod-ep-none">Aucun code repéré dans les notes.</p>}
                </li>
              ))}
            </ol>
          ))}
          {history && history.olderCodes > 0 && <p className="muted">Et {history.olderCodes} code{history.olderCodes > 1 ? 's' : ''} venant d’épisodes plus anciens.</p>}
          {history && <p className="muted adm-pod-history-note">« Lu » : Koupi a lu ses notes. Les épisodes trop anciens au moment du suivi, ou sortis depuis la dernière lecture, ne le sont pas.</p>}
        </section>
      </>}
    </AdminDrawer>
  );
}
