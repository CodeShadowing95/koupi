// Podcasts suivis (table watched_sources, plateforme « podcast ») : l'admin les choisit dans l'annuaire Apple Podcasts.
// Suivre un podcast crée aussi son créateur (au nom du podcast) et relie le compte « podcast » à ce créateur.
import { and, asc, eq, gte, isNull, sql } from 'drizzle-orm';
import type { Db } from '@/db';
import { codes, creatorAccounts, creators, dailyCounters, watchedSources } from '@/db/schema';
import { monthStart } from './creator-directory';
import { resolveCreator } from './codes-admin';
import type { PodcastFeed } from './apple-podcasts';

type Parsed<T> = { ok: true; data: T } | { ok: false; error: string };

export type AdminPodcast = {
  id: string; feedId: string; title: string; feedUrl: string | null; active: boolean;
  lastFetchedAt: string | null; createdAt: string; creatorId: string | null; creatorName: string | null; creatorSlug: string | null;
  /** Codes dont la source est un épisode de ce podcast (tous statuts, hors archivés). */
  codesFound: number;
  /** Parmi eux, ceux publiés sur le site (vérifiés ou à tester). */
  codesPublished: number;
  /** Copies de ces codes par les visiteurs depuis le début du mois. */
  copiesThisMonth: number;
  /** Date d'ajout du code le plus récent, null sans code. */
  lastCodeAt: string | null;
};

/** Page publique d'un podcast sur Apple Podcasts : sert de lien quand l'annuaire n'en donne pas. */
export function applePodcastUrl(podcastId: number | string, episodeId?: number): string {
  return `https://podcasts.apple.com/podcast/id${podcastId}${episodeId ? `?i=${episodeId}` : ''}`;
}

export async function listPodcasts(db: Db, now = new Date()): Promise<AdminPodcast[]> {
  // Un code vient d'un podcast quand sa source est un épisode Apple Podcasts de ce podcast.
  const fromPodcast = sql`${codes.sourceUrl} ~ ('^https://podcasts\\.apple\\.com/.*/id' || ${watchedSources.externalId} || '\\?')`;
  const copies = db.select({ key: dailyCounters.key, n: sql<number>`sum(${dailyCounters.count})`.as('n') }).from(dailyCounters)
    .where(and(eq(dailyCounters.metric, 'copy'), gte(dailyCounters.day, monthStart(now)))).groupBy(dailyCounters.key).as('copies');
  const [rows, stats] = await Promise.all([
    db.select({ source: watchedSources, creator: { name: creators.name, slug: creators.slug } })
      .from(watchedSources).leftJoin(creators, eq(creators.id, watchedSources.creatorId))
      .where(eq(watchedSources.platform, 'podcast'))
      .orderBy(asc(watchedSources.title)),
    db.select({
      id: watchedSources.id,
      found: sql<number>`count(${codes.id})`.mapWith(Number),
      published: sql<number>`count(*) filter (where ${codes.status} in ('verified', 'to_test'))`.mapWith(Number),
      copies: sql<number>`coalesce(sum(${copies.n}), 0)`.mapWith(Number),
      lastCodeAt: sql<string | null>`max(${codes.createdAt})`,
    }).from(watchedSources)
      .innerJoin(codes, and(isNull(codes.archivedAt), fromPodcast))
      .leftJoin(copies, sql`${copies.key} = ${codes.id}::text`)
      .where(eq(watchedSources.platform, 'podcast'))
      .groupBy(watchedSources.id),
  ]);
  const byId = new Map(stats.map(row => [row.id, row]));
  return rows.map(({ source, creator }) => {
    const stat = byId.get(source.id);
    return {
      id: source.id, feedId: source.externalId, title: source.title, feedUrl: source.feedUrl, active: source.active,
      lastFetchedAt: source.lastFetchedAt?.toISOString() ?? null, createdAt: source.createdAt.toISOString(),
      creatorId: source.creatorId, creatorName: creator?.name ?? null, creatorSlug: creator?.slug ?? null,
      codesFound: stat?.found ?? 0, codesPublished: stat?.published ?? 0, copiesThisMonth: stat?.copies ?? 0,
      lastCodeAt: stat?.lastCodeAt ? new Date(stat.lastCodeAt).toISOString() : null,
    };
  });
}

/** Suit un podcast trouvé dans l'annuaire. Le refuse s'il est déjà suivi. */
export async function followPodcast(db: Db, feed: PodcastFeed): Promise<Parsed<{ id: string; creatorId: string }>> {
  const feedId = String(feed.id);
  const [existing] = await db.select({ id: watchedSources.id }).from(watchedSources)
    .where(and(eq(watchedSources.platform, 'podcast'), eq(watchedSources.externalId, feedId))).limit(1);
  if (existing) return { ok: false, error: `« ${feed.title} » est déjà suivi.` };

  // Le créateur du podcast : celui qui a déjà ce compte podcast, sinon un créateur au nom du podcast.
  const [account] = await db.select({ creatorId: creatorAccounts.creatorId }).from(creatorAccounts)
    .where(and(eq(creatorAccounts.platform, 'podcast'), eq(creatorAccounts.externalId, feedId))).limit(1);
  const creatorId = account?.creatorId ?? await resolveCreator(db, feed.title.slice(0, 160));
  if (!account) {
    const url = feed.link || applePodcastUrl(feed.id);
    await db.insert(creatorAccounts).values({
      creatorId, platform: 'podcast', externalId: feedId, handle: feed.title.slice(0, 120), url,
      ...(feed.episodeCount > 0 ? { metrics: { episodes: feed.episodeCount }, metricsAt: new Date() } : {}),
    }).onConflictDoNothing();
  }

  const [row] = await db.insert(watchedSources).values({
    platform: 'podcast', externalId: feedId, title: feed.title.slice(0, 200),
    feedUrl: feed.feedUrl || null, creatorId,
  }).returning({ id: watchedSources.id });
  return { ok: true, data: { id: row.id, creatorId } };
}

export async function setPodcastActive(db: Db, id: string, active: boolean): Promise<boolean> {
  const rows = await db.update(watchedSources).set({ active })
    .where(and(eq(watchedSources.id, id), eq(watchedSources.platform, 'podcast'))).returning({ id: watchedSources.id });
  return rows.length > 0;
}

/** Arrête de suivre un podcast. Son créateur, son compte et ses codes restent. */
export async function unfollowPodcast(db: Db, id: string): Promise<boolean> {
  const rows = await db.delete(watchedSources)
    .where(and(eq(watchedSources.id, id), eq(watchedSources.platform, 'podcast'))).returning({ id: watchedSources.id });
  return rows.length > 0;
}

/** Podcasts validés par Vastolorde pour démarrer (spec des vérifications). Servent de raccourcis de recherche. */
export const STARTER_PODCASTS = [
  'Génération Do It Yourself', 'La Martingale', 'Silicon Carne', 'Le Gratin', 'Nouvelle École', 'J’peux pas j’ai business', 'Le Rendez-vous Tech',
  'Lex Fridman Podcast', 'The Diary Of A CEO', 'My First Million', 'Syntax', 'Darknet Diaries',
] as const;
