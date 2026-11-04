// Historique d'un podcast suivi : ses derniers épisodes dans Apple Podcasts, lesquels Merkod a déjà lus,
// et les codes (ou outils à ajouter) trouvés dans chacun. Rien n'est enregistré : tout est recalculé à l'ouverture.
import { and, eq, sql } from 'drizzle-orm';
import type { Db } from '@/db';
import { codes, toolSuggestions, tools, watchedSources, CODE_STATUSES } from '@/db/schema';
import { appleEpisodeRef, type PodcastDirectory } from './apple-podcasts';
import { applePodcastUrl } from './podcasts-admin';
import { FIRST_READ_DAYS } from './podcast-read';

const DAY = 24 * 60 * 60 * 1000;
export const HISTORY_EPISODES = 20;

export type HistoryCode = { id: string; code: string; tool: string; status: typeof CODE_STATUSES[number]; archived: boolean };
export type HistorySuggestion = { id: string; name: string; code: string; status: 'open' | 'added' | 'ignored' };
export type HistoryEpisode = {
  id: number; title: string; link: string; publishedAt: string | null;
  /** Lu : sorti dans la fenêtre de lecture, et avant la dernière lecture. */
  read: boolean;
  codes: HistoryCode[];
  suggestions: HistorySuggestion[];
};
export type PodcastHistory = { episodes: HistoryEpisode[]; lastFetchedAt: string | null; olderCodes: number };

export async function podcastHistory(db: Db, directory: PodcastDirectory, id: string): Promise<PodcastHistory | null> {
  const [podcast] = await db.select().from(watchedSources).where(and(eq(watchedSources.id, id), eq(watchedSources.platform, 'podcast'))).limit(1);
  if (!podcast) return null;
  const feedId = Number(podcast.externalId);
  const episodes = await directory.episodes(feedId, { max: HISTORY_EPISODES });

  // Codes et suggestions dont la source est un épisode de ce podcast.
  const pattern = `^https://podcasts\\.apple\\.com/.*/id${podcast.externalId}\\?`;
  const codeRows = await db.select({ id: codes.id, code: codes.code, status: codes.status, archivedAt: codes.archivedAt, sourceUrl: codes.sourceUrl, tool: tools.name })
    .from(codes).innerJoin(tools, eq(tools.id, codes.toolId))
    .where(sql`${codes.sourceUrl} ~ ${pattern}`);
  const suggestionRows = await db.select({ id: toolSuggestions.id, name: toolSuggestions.name, code: toolSuggestions.code, status: toolSuggestions.status, sourceUrl: toolSuggestions.sourceUrl, codeId: toolSuggestions.codeId })
    .from(toolSuggestions).where(sql`${toolSuggestions.sourceUrl} ~ ${pattern}`);

  const episodeOf = (url: string) => appleEpisodeRef(url)?.episodeId ?? null;
  const shown = new Set(episodes.map(episode => episode.id));
  const lastRead = podcast.lastFetchedAt?.getTime() ?? null;
  // Première lecture : les épisodes des FIRST_READ_DAYS jours avant le suivi (ou la première lecture) ont été lus.
  const windowStart = podcast.createdAt.getTime() - FIRST_READ_DAYS * DAY;

  return {
    lastFetchedAt: podcast.lastFetchedAt?.toISOString() ?? null,
    olderCodes: codeRows.filter(row => !shown.has(episodeOf(row.sourceUrl) ?? -1)).length,
    episodes: episodes.map(episode => {
      const published = episode.publishedAt?.getTime() ?? null;
      const found = codeRows.filter(row => episodeOf(row.sourceUrl) === episode.id);
      return {
        id: episode.id,
        title: episode.title,
        link: appleEpisodeRef(episode.link) ? episode.link : applePodcastUrl(feedId, episode.id),
        publishedAt: episode.publishedAt?.toISOString() ?? null,
        read: lastRead !== null && published !== null && published <= lastRead && published >= windowStart,
        codes: found.map(row => ({ id: row.id, code: row.code, tool: row.tool, status: row.status, archived: Boolean(row.archivedAt) })),
        // Une suggestion ajoutée a déjà son code dans la liste : on ne la répète pas.
        suggestions: suggestionRows.filter(row => episodeOf(row.sourceUrl) === episode.id && !(row.status === 'added' && found.some(code => code.id === row.codeId)))
          .map(row => ({ id: row.id, name: row.name, code: row.code, status: row.status })),
      };
    }),
  };
}
