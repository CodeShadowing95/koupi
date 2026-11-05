// Sources de codes affichées sur la page Sources de l'admin : libellés, ce que chacune fait, et l'heure de la tâche de nuit.
// Sans base ni réseau : importable par les composants client.
import type { CodeOrigin } from './code-origin';

export type RunSource = 'youtube_search' | 'youtube_channel' | 'podcast';
export type RunTrigger = 'manual' | 'cron';
export type RunStatus = 'ok' | 'partial' | 'failed';

export const RUN_SOURCE_LABELS: Record<RunSource, string> = {
  youtube_search: 'Recherche YouTube',
  youtube_channel: 'Chaînes YouTube suivies',
  podcast: 'Podcasts suivis',
};

/** Ce qu'une source lit, pour les compteurs : vidéos ou épisodes. */
export const RUN_ITEM_LABELS: Record<RunSource, [string, string]> = {
  youtube_search: ['vidéo', 'vidéos'],
  youtube_channel: ['vidéo', 'vidéos'],
  podcast: ['épisode', 'épisodes'],
};

/**
 * Heure de la tâche de nuit en UTC (à garder en phase avec vercel.json, vérifié par un test).
 * Les sources sans tâche de nuit se lancent à la main.
 */
export const NIGHTLY_UTC: Partial<Record<RunSource, { hour: number; minute: number; path: string }>> = {
  podcast: { hour: 3, minute: 30, path: '/api/cron/podcasts' },
  youtube_channel: { hour: 4, minute: 0, path: '/api/cron/youtube-channels' },
};

/** Prochain passage de la tâche de nuit d'une source, null si elle n'en a pas. */
export function nextNightlyRun(source: RunSource, now: Date): Date | null {
  const slot = NIGHTLY_UTC[source];
  if (!slot) return null;
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), slot.hour, slot.minute));
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
  return next;
}

/** Origine des codes trouvés par chaque source qui a des passages (ADR-0032). */
export const RUN_SOURCE_ORIGIN: Record<RunSource, CodeOrigin> = {
  youtube_search: 'youtube_search',
  youtube_channel: 'youtube_channel',
  podcast: 'podcast',
};

/** Rendement d'une origine de codes : trouvés, publiés sur le site, rejetés, en attente, copiés ce mois-ci. */
export type OriginYield = { found: number; foundThisMonth: number; published: number; rejected: number; waiting: number; copies: number };

export const EMPTY_YIELD: OriginYield = { found: 0, foundThisMonth: 0, published: 0, rejected: 0, waiting: 0, copies: 0 };

/** Part des codes jugés qui ont été publiés, en %. null tant qu'aucun n'a été jugé. */
export function publishRate(item: Pick<OriginYield, 'published' | 'rejected'>): number | null {
  const judged = item.published + item.rejected;
  return judged === 0 ? null : Math.round((item.published / judged) * 100);
}

/** État d'un passage d'après son compte rendu : échec complet, partiel (une partie n'a pas répondu) ou réussi. */
export function runStatus(report: { failed: string[] }, attempted: number): RunStatus {
  if (report.failed.length === 0) return 'ok';
  return report.failed.length >= attempted && attempted > 0 ? 'failed' : 'partial';
}
