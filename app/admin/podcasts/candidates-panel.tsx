'use client';
// Onglet « Candidats » de Podcasts (ADR-0036) : les podcasts trouvés chaque semaine dans la base de Podcast Index,
// qui citent un outil du catalogue près d'un code. L'admin suit ceux qui l'intéressent, ou les écarte.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { sendJson } from '@/components/admin-form-dialog';
import type { AdminCandidate } from '@/lib/podcast-candidates';

const dayFormat = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Paris' });
const day = (iso: string) => dayFormat.format(new Date(iso));
const languageLabel = (code: string) => (code.startsWith('fr') ? 'Français' : code.startsWith('en') ? 'Anglais' : code.toUpperCase());

export function CandidatesPanel({ candidates }: { candidates: AdminCandidate[] }) {
  const router = useRouter();
  const [showDismissed, setShowDismissed] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const open = candidates.filter(item => item.status === 'new');
  const dismissed = candidates.filter(item => item.status === 'dismissed');
  const shown = showDismissed ? dismissed : open;
  const lastRun = candidates.reduce<string | null>((latest, item) => (!latest || item.lastSeenAt > latest ? item.lastSeenAt : latest), null);

  async function act(key: string, request: () => Promise<string | null>) {
    setBusy(key);
    setError('');
    const failure = await request();
    setBusy(null);
    if (failure) setError(failure);
    else router.refresh();
  }
  const follow = (item: AdminCandidate) => act(`follow-${item.id}`, () => sendJson('/api/admin/podcasts', 'POST', { podcastId: Number(item.itunesId) }));
  const setStatus = (item: AdminCandidate, status: 'new' | 'dismissed') => act(`status-${item.id}`, () => sendJson(`/api/admin/podcasts/candidates/${item.id}`, 'PATCH', { status }));

  return (
    <section id="pod-panel-candidates" role="tabpanel" aria-labelledby="pod-tab-candidates">
      <p className="muted adm-pod-cand-intro">
        Chaque lundi, Merkod parcourt la base publique de Podcast Index : les 10 000 podcasts les plus populaires, actifs depuis 90 jours,
        en français ou en anglais, tous genres confondus. Il lit leurs épisodes et garde ceux qui citent un outil du catalogue près d’un code.
        {lastRun ? <> Dernier passage le <b>{day(lastRun)}</b>.</> : null} <b>Suivre</b> en fait un podcast lu chaque nuit ; <b>Écarter</b> le range sans le supprimer.
      </p>
      {error && <div className="notice notice-error" role="alert">{error}</div>}
      {candidates.length === 0 ? (
        <div className="adm-empty">Aucun candidat pour l’instant. Le premier passage a lieu le lundi qui suit la mise en place (voir le guide, chapitre Podcasts).</div>
      ) : <>
        <div className="adm-tabs" role="group" aria-label="Filtre des candidats">
          <button type="button" className="adm-tab" aria-pressed={!showDismissed} onClick={() => setShowDismissed(false)}>À examiner <span className="adm-tab-n">{open.length}</span></button>
          <button type="button" className="adm-tab" aria-pressed={showDismissed} onClick={() => setShowDismissed(true)}>Écartés <span className="adm-tab-n">{dismissed.length}</span></button>
        </div>
        {shown.length === 0 ? <div className="adm-empty">{showDismissed ? 'Aucun candidat écarté.' : 'Tu as examiné tous les candidats. Les prochains arrivent lundi.'}</div> : (
          <ul className="adm-pod-results adm-pod-cands">
            {shown.map(item => (
              <li key={item.id} className="adm-pod-result adm-pod-cand">
                {item.imageUrl ? <img src={item.imageUrl} alt="" width={56} height={56} loading="lazy" referrerPolicy="no-referrer" /> : <span className="adm-pod-noimg" aria-hidden="true" />}
                <div className="adm-pod-info">
                  <b>{item.title}</b>
                  <small>{[item.author, languageLabel(item.language), item.category, item.episodeCount ? `${item.episodeCount} épisodes` : '', item.newestEpisodeAt ? `dernier épisode le ${day(item.newestEpisodeAt)}` : ''].filter(Boolean).join(' · ')}</small>
                  <ul className="adm-pod-hits" aria-label="Codes repérés">
                    {item.hits.map(hit => (
                      <li key={`${hit.toolId}-${hit.code}`}>
                        <span className="adm-pod-chip adm-pod-hit"><b>{hit.toolName}</b> · <span className="mono">{hit.code}</span></span>
                        <q title={hit.evidence}>{hit.evidence}</q>
                        {hit.episodeUrl
                          ? <a href={hit.episodeUrl} target="_blank" rel="noopener noreferrer nofollow">{hit.episodeTitle || 'Épisode'} ↗</a>
                          : hit.episodeTitle && <small className="muted">{hit.episodeTitle}</small>}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="adm-pod-cand-actions">
                  <button type="button" className="adm-btn adm-btn-pri" disabled={busy !== null} onClick={() => follow(item)}>{busy === `follow-${item.id}` ? 'Ajout…' : 'Suivre'}</button>
                  {item.status === 'new'
                    ? <button type="button" className="adm-btn" disabled={busy !== null} onClick={() => setStatus(item, 'dismissed')}>Écarter</button>
                    : <button type="button" className="adm-btn" disabled={busy !== null} onClick={() => setStatus(item, 'new')}>Remettre</button>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </>}
    </section>
  );
}
