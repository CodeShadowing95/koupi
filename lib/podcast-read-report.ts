// Additionne les comptes rendus des lots successifs d'une lecture des podcasts (voir PODCAST_RUN_BUDGET_MS).
// Fichier sans dépendance serveur : la page admin l'utilise directement.
import type { PodcastReadReport } from './podcast-read';

export const MAX_READ_ROUNDS = 15;

export function mergeReports(total: PodcastReadReport | null, next: PodcastReadReport): PodcastReadReport {
  if (!total) return next;
  return {
    podcasts: total.podcasts + next.podcasts,
    episodes: total.episodes + next.episodes,
    found: [...total.found, ...next.found],
    suggested: [...total.suggested, ...next.suggested],
    failed: [...total.failed, ...next.failed],
    aiRead: total.aiRead + next.aiRead,
    remaining: next.remaining,
  };
}
