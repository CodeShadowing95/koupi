// Mesures d'audience d'un compte créateur, quelle que soit la source (ADR-0030) : note et nombre de notes
// (Apple Podcasts, plus tard Spotify…), épisodes, vues et vidéos YouTube. Gardées dans creator_accounts.metrics (JSON).
// Une nouvelle source ajoute ses mesures ici, sans migration. Sans base ni réseau : importable par les composants client.

export type AccountMetrics = {
  /** Note moyenne sur 5. */
  rating?: number;
  /** Nombre de notes derrière la moyenne. */
  ratingCount?: number;
  /** D'où vient la note (« Apple Podcasts », « Spotify »…), affiché à côté. */
  ratingSource?: string;
  /** Épisodes publiés (podcasts). */
  episodes?: number;
  /** Vues cumulées (YouTube). */
  views?: number;
  /** Vidéos publiées (YouTube). */
  videos?: number;
};

const COUNTS = ['ratingCount', 'episodes', 'views', 'videos'] as const;
const MAX_COUNT = 1e13;

/** Garde seulement les mesures valides d'une valeur lue en base ou reçue d'une source. Objet vide si rien ne va. */
export function cleanMetrics(value: unknown): AccountMetrics {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const raw = value as Record<string, unknown>;
  const metrics: AccountMetrics = {};
  if (typeof raw.rating === 'number' && Number.isFinite(raw.rating) && raw.rating >= 0 && raw.rating <= 5) metrics.rating = Math.round(raw.rating * 100) / 100;
  for (const key of COUNTS) {
    const count = raw[key];
    if (typeof count === 'number' && Number.isSafeInteger(count) && count >= 0 && count <= MAX_COUNT) metrics[key] = count;
  }
  if (typeof raw.ratingSource === 'string' && raw.ratingSource.trim()) metrics.ratingSource = raw.ratingSource.trim().slice(0, 40);
  if (metrics.rating === undefined) { delete metrics.ratingCount; delete metrics.ratingSource; }
  return metrics;
}

/** Ancienne et nouvelle mesures réunies : une lecture qui échoue sur une mesure ne l'efface pas. */
export function mergeMetrics(previous: unknown, next: AccountMetrics): AccountMetrics {
  return cleanMetrics({ ...cleanMetrics(previous), ...cleanMetrics(next) });
}

const number = (value: number) => new Intl.NumberFormat('fr-FR').format(value).replace(/ | /g, ' ');
const plural = (count: number, one: string, many: string) => `${number(count)} ${count > 1 ? many : one}`;

/** « 4,7 ★ » */
export function formatRating(rating: number): string {
  return `${new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(rating)} ★`;
}

/**
 * Les mesures en morceaux courts, dans l'ordre d'importance : « 4,7 ★ », « 5 281 notes », « 1 100 épisodes »…
 * Les abonnés restent à part (colonne subscribers, utilisée pour le seuil de contrôle).
 */
export function metricParts(metrics: AccountMetrics): string[] {
  const parts: string[] = [];
  if (metrics.rating !== undefined) {
    parts.push(formatRating(metrics.rating));
    if (metrics.ratingCount !== undefined) parts.push(plural(metrics.ratingCount, 'note', 'notes'));
  }
  if (metrics.episodes !== undefined) parts.push(plural(metrics.episodes, 'épisode', 'épisodes'));
  if (metrics.views !== undefined) parts.push(plural(metrics.views, 'vue', 'vues'));
  if (metrics.videos !== undefined) parts.push(plural(metrics.videos, 'vidéo', 'vidéos'));
  return parts;
}

/** Ligne d'audience d'un compte : abonnés s'ils sont connus, puis les mesures. null si on ne sait rien. */
export function audienceLine(subscribers: string | null, metrics: AccountMetrics): string | null {
  const parts = [...(subscribers ? [subscribers] : []), ...metricParts(metrics)];
  return parts.length ? parts.join(' · ') : null;
}
