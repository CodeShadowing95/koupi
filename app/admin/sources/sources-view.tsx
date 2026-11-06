'use client';
// Page Sources : une carte par source de codes (ce qu'elle fait, ce qu'elle rapporte, ce qu'elle coûte, quand elle repasse),
// un bouton pour la lancer tout de suite, et le journal des derniers passages.
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { StatusDot, type Tone } from '@/components/admin-card';
import { InfoTip } from '@/components/admin-info-tip';
import { confirmAction } from '@/components/admin-ask';
import type { CodeOrigin } from '@/lib/code-origin';
import type { RunRow, SourceActivity } from '@/lib/source-runs';
import {
  EMPTY_YIELD, RUN_ITEM_LABELS, RUN_SOURCE_LABELS, nextNightlyRun, publishRate, type OriginYield, type RunSource, type RunStatus,
} from '@/lib/sources';

type Inventory = { channels: { active: number; paused: number }; podcasts: { active: number; paused: number }; submissionsNew: number };

const when = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' });
const hour = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' });
const plural = (count: number, one: string, many: string) => `${count.toLocaleString('fr-FR')} ${count > 1 ? many : one}`;
const usd = (value: number) => value.toLocaleString('fr-FR', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

const STATUS: Record<RunStatus, { tone: Tone; label: string }> = {
  ok: { tone: 'ok', label: 'Réussi' },
  partial: { tone: 'warn', label: 'En partie' },
  failed: { tone: 'bad', label: 'Échec' },
};

function YieldTiles({ item }: { item: OriginYield }) {
  const rate = publishRate(item);
  return (
    <dl className="adm-src-tiles">
      <div><dt>Codes trouvés</dt><dd>{item.found}</dd>{item.foundThisMonth > 0 && <small>dont {item.foundThisMonth} ce mois-ci</small>}</div>
      <div><dt>Publiés</dt><dd>{item.published}</dd><small>{rate === null ? 'aucun jugé' : `${rate} % des jugés`}</small></div>
      <div><dt>En attente</dt><dd>{item.waiting}</dd>{item.waiting > 0 && <small><Link href="/admin/verifications">à vérifier</Link></small>}</div>
      <div><dt>Copies</dt><dd>{item.copies}</dd><small>ce mois-ci</small></div>
    </dl>
  );
}

function RunFacts({ source, activity, now }: { source: RunSource; activity: SourceActivity; now: Date }) {
  const next = nextNightlyRun(source, now);
  const last = activity.lastRun;
  return (
    <ul className="adm-src-facts">
      <li><span>Dernier passage</span><b>{last ? <>{when.format(new Date(last.startedAt))} · <StatusDot tone={STATUS[last.status].tone}>{STATUS[last.status].label}</StatusDot></> : 'Jamais'}</b></li>
      <li><span>Prochain passage</span><b>{next ? `Chaque nuit à ${hour.format(next)}` : 'Quand tu le lances'}</b></li>
      <li><span>Ce mois-ci</span><b>{plural(activity.runsThisMonth, 'passage', 'passages')}{activity.unitsThisMonth > 0 && ` · ${activity.unitsThisMonth.toLocaleString('fr-FR')} unités YouTube`}{activity.aiUsdThisMonth > 0 && ` · ${usd(activity.aiUsdThisMonth)} d’IA`}</b></li>
    </ul>
  );
}

/** Bouton qui lance une source tout de suite, avec son coût annoncé avant. */
function RunNow({ label, url, body, confirm, disabled, title }: { label: string; url: string; body?: object; confirm?: string; disabled?: boolean; title?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  async function run() {
    if (confirm && !(await confirmAction(confirm, { confirmLabel: 'Lancer' }))) return;
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body ?? {}) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) setMessage({ tone: 'error', text: data.error ?? 'Le passage a échoué.' });
      else {
        const found = Array.isArray(data.found) ? data.found.length : 0;
        setMessage({ tone: 'ok', text: found ? `${plural(found, 'nouveau code', 'nouveaux codes')} en attente dans Vérifications.` : 'Passage terminé : aucun nouveau code.' });
        router.refresh();
      }
    } catch {
      setMessage({ tone: 'error', text: 'Le passage a échoué : vérifie ta connexion.' });
    }
    setBusy(false);
  }
  return (
    <>
      <button type="button" className="adm-btn adm-btn-pri" disabled={busy || disabled} title={title} onClick={run}>{busy ? 'Lecture…' : label}</button>
      {message && <p className={`adm-src-msg is-${message.tone}`} role="status">{message.text}</p>}
    </>
  );
}

export function SourcesView({ activity, yields, inventory, runs, now: nowIso, youtubeReady }: {
  activity: Record<RunSource, SourceActivity>; yields: Record<CodeOrigin, OriginYield>; inventory: Inventory; runs: RunRow[]; now: string; youtubeReady: boolean;
}) {
  const now = new Date(nowIso);
  const y = (origin: CodeOrigin) => yields[origin] ?? EMPTY_YIELD;
  const byHand = ['manual', 'import', 'unknown'].reduce<OriginYield>((sum, origin) => {
    const item = y(origin as CodeOrigin);
    return { found: sum.found + item.found, foundThisMonth: sum.foundThisMonth + item.foundThisMonth, published: sum.published + item.published, rejected: sum.rejected + item.rejected, waiting: sum.waiting + item.waiting, copies: sum.copies + item.copies };
  }, { ...EMPTY_YIELD });

  return (
    <main className="adm-page">
      <div className="container">
        <div className="adm-head">
          <div>
            <span className="eyebrow">Catalogue</span>
            <h1>Sources</h1>
            <p>D’où viennent les codes. Chaque carte dit ce que fait une source, ce qu’elle rapporte (codes trouvés, publiés, copiés) et ce qu’elle coûte. Les sources qui rapportent peu se mettent en pause ; celles qui rapportent beaucoup méritent d’être nourries.</p>
          </div>
        </div>

        <div className="adm-src-grid">
          <article className="adm-src-card">
            <header><h2>{RUN_SOURCE_LABELS.youtube_channel}</h2>{inventory.channels.active > 0 ? <StatusDot tone="ok">Lues chaque nuit</StatusDot> : <StatusDot tone="muted">Aucune chaîne suivie</StatusDot>}</header>
            <p className="adm-src-what">Les nouvelles vidéos des chaînes des créateurs qu’on suit. La source la moins chère : environ 1 unité par chaîne. {plural(inventory.channels.active, 'chaîne suivie', 'chaînes suivies')}{inventory.channels.paused > 0 && `, ${inventory.channels.paused} en pause`}.</p>
            <YieldTiles item={y('youtube_channel')} />
            <RunFacts source="youtube_channel" activity={activity.youtube_channel} now={now} />
            <div className="adm-src-actions">
              <RunNow label="Lire maintenant" url="/api/admin/youtube-channels/read" disabled={!youtubeReady || inventory.channels.active === 0}
                title={!youtubeReady ? 'La clé YouTube manque' : inventory.channels.active === 0 ? 'Aucune chaîne suivie' : undefined}
                confirm={`Lire les ${inventory.channels.active} chaînes suivies maintenant ? Environ ${inventory.channels.active} unités du quota YouTube (sur 10 000 par jour).`} />
              <Link className="adm-btn" href="/admin/createurs">Choisir les chaînes</Link>
            </div>
          </article>

          <article className="adm-src-card">
            <header><h2>{RUN_SOURCE_LABELS.podcast}</h2>{inventory.podcasts.active > 0 ? <StatusDot tone="ok">Lus chaque nuit</StatusDot> : <StatusDot tone="muted">Aucun podcast suivi</StatusDot>}</header>
            <p className="adm-src-what">Les notes des nouveaux épisodes, lues sur Apple Podcasts. Gratuit. {plural(inventory.podcasts.active, 'podcast suivi', 'podcasts suivis')}{inventory.podcasts.paused > 0 && `, ${inventory.podcasts.paused} en pause`}.</p>
            <YieldTiles item={y('podcast')} />
            <RunFacts source="podcast" activity={activity.podcast} now={now} />
            <div className="adm-src-actions">
              <RunNow label="Lire maintenant" url="/api/admin/podcasts/read" disabled={inventory.podcasts.active === 0} title={inventory.podcasts.active === 0 ? 'Aucun podcast suivi' : undefined} />
              <Link className="adm-btn" href="/admin/podcasts">Gérer les podcasts</Link>
            </div>
          </article>

          <article className="adm-src-card">
            <header><h2>{RUN_SOURCE_LABELS.youtube_search}</h2>{youtubeReady ? <StatusDot tone="info">À la demande</StatusDot> : <StatusDot tone="bad">Clé YouTube manquante</StatusDot>}</header>
            <p className="adm-src-what">Une recherche sur YouTube pour un outil ou une catégorie : elle trouve de nouvelles chaînes. Chère : 100 unités par recherche. Chaque recherche change de formulation et écarte les vidéos déjà lues.</p>
            <YieldTiles item={y('youtube_search')} />
            <RunFacts source="youtube_search" activity={activity.youtube_search} now={now} />
            <div className="adm-src-actions">
              <RunNow label="Chercher pour les catégories vides" url="/api/admin/categories/search-codes" disabled={!youtubeReady} title={youtubeReady ? undefined : 'La clé YouTube manque'}
                confirm="Chercher des codes pour les outils des catégories vides ? Jusqu’à 20 recherches, soit environ 2 000 unités du quota YouTube (sur 10 000 par jour)." />
              <Link className="adm-btn" href="/admin/categories">Par catégorie</Link>
              <Link className="adm-btn" href="/admin/outils">Par outil</Link>
            </div>
          </article>

          <article className="adm-src-card">
            <header><h2>Propositions des visiteurs</h2>{inventory.submissionsNew > 0 ? <StatusDot tone="warn">{plural(inventory.submissionsNew, 'à traiter', 'à traiter')}</StatusDot> : <StatusDot tone="ok">À jour</StatusDot>}</header>
            <p className="adm-src-what">Les codes envoyés par les visiteurs depuis « Proposer un code ». Gratuit, mais chaque proposition attend ta réponse.</p>
            <YieldTiles item={y('submission')} />
            <div className="adm-src-actions"><Link className="adm-btn adm-btn-pri" href="/admin/propositions">Ouvrir les propositions</Link></div>
          </article>

          <article className="adm-src-card">
            <header><h2>Ajouts à la main et import</h2><StatusDot tone="muted">Par toi</StatusDot></header>
            <p className="adm-src-what">Les codes que tu as saisis, ceux de l’import de départ, et les plus anciens dont on ne connaît pas la source.</p>
            <YieldTiles item={byHand} />
            <div className="adm-src-actions"><Link className="adm-btn" href="/admin/codes">Voir les codes</Link></div>
          </article>

          <article className="adm-src-card is-soon">
            <header><h2>Bientôt</h2><StatusDot tone="muted">Prévu</StatusDot></header>
            <p className="adm-src-what">Recherche par l’IA sur le web et Spotify. Elles apparaîtront ici avec leur rendement et leur coût dès qu’elles seront branchées. L’annuaire Podcast Index propose déjà chaque lundi des podcasts à suivre, dans Podcasts › Candidats.</p>
          </article>
        </div>

        <section className="adm-src-journal">
          <div className="adm-src-journal-head">
            <h2>Journal des passages</h2>
            <InfoTip id="src-journal" label="Le journal">Chaque lecture ou recherche, lancée par toi ou par la tâche de nuit : ce qu’elle a lu, trouvé et coûté. « En partie » : une chaîne ou un podcast n’a pas répondu, les autres ont été lus.</InfoTip>
          </div>
          {runs.length === 0 ? <div className="adm-empty">Aucun passage pour l’instant. Les prochains apparaîtront ici.</div> : (
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead><tr><th scope="col">Quand</th><th scope="col">Source</th><th scope="col">Lancé par</th><th scope="col">Ce qui a été lu</th><th scope="col">Lu</th><th scope="col">Codes</th><th scope="col">Unités</th><th scope="col">État</th></tr></thead>
                <tbody>
                  {runs.map(run => (
                    <tr key={run.id}>
                      <td className="adm-cell-nowrap">{when.format(new Date(run.startedAt))}</td>
                      <td className="adm-cell-nowrap">{RUN_SOURCE_LABELS[run.source]}</td>
                      <td className="adm-cell-nowrap">{run.trigger === 'cron' ? 'La nuit' : 'Toi'}</td>
                      <td className="adm-cell-wrap">{run.scope || '—'}</td>
                      <td className="adm-cell-nowrap">{plural(run.items, RUN_ITEM_LABELS[run.source][0], RUN_ITEM_LABELS[run.source][1])}</td>
                      <td className="adm-cell-nowrap">{run.codes}{run.suggested > 0 && <span className="muted"> + {run.suggested} hors catalogue</span>}</td>
                      <td className="adm-cell-nowrap">{run.units || '—'}</td>
                      <td className="adm-cell-wrap"><StatusDot tone={STATUS[run.status].tone}>{STATUS[run.status].label}</StatusDot>{run.error && <small className="adm-src-error">{run.error}</small>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
