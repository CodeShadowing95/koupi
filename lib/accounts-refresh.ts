// « Actualiser les comptes » en haut de la page Créateurs : relit d'un coup l'audience, le pays et la langue des comptes.
// YouTube : toutes les chaînes, par lots de 50 (1 unité de quota par lot). Podcasts : les moins récemment relus d'abord,
// par paquets (une page Apple et un début de flux RSS par podcast), pour tenir dans le temps d'une requête.
import { and, asc, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import type { Db } from '@/db';
import { creatorAccounts, creators } from '@/db/schema';
import { mergeMetrics } from './account-metrics';
import type { AudienceReader } from './creator-accounts';
import type { YoutubeBatch } from './creator-youtube-link';

export const PODCASTS_PER_RUN = 15;

export type AccountsRefreshReport = {
  youtube: number;
  podcasts: number;
  /** Podcasts pas encore relus dans ce passage : il suffit de recliquer. */
  podcastsLeft: number;
  failed: { creator: string; reason: string }[];
  /** null : la clé YouTube manque, les chaînes n'ont pas été relues. */
  youtubeReady: boolean;
};

export async function refreshAllAccounts(db: Db, sources: { youtube: Pick<YoutubeBatch, 'channels'> | null; podcast: AudienceReader }, options: { now?: Date; podcastLimit?: number } = {}): Promise<AccountsRefreshReport> {
  const now = options.now ?? new Date();
  const report: AccountsRefreshReport = { youtube: 0, podcasts: 0, podcastsLeft: 0, failed: [], youtubeReady: sources.youtube !== null };
  const select = { id: creatorAccounts.id, externalId: creatorAccounts.externalId, url: creatorAccounts.url, metrics: creatorAccounts.metrics, name: creators.name };

  if (sources.youtube) {
    const channels = await db.select(select).from(creatorAccounts).innerJoin(creators, eq(creators.id, creatorAccounts.creatorId))
      .where(and(eq(creatorAccounts.platform, 'youtube'), isNotNull(creatorAccounts.externalId)));
    if (channels.length) {
      const infos = await sources.youtube.channels(channels.map(row => row.externalId!));
      for (const row of channels) {
        const info = infos.get(row.externalId!);
        if (!info) { report.failed.push({ creator: row.name, reason: 'Sa chaîne YouTube n’a pas pu être lue.' }); continue; }
        await db.update(creatorAccounts).set({
          subscribers: info.subscribers, subscribersAt: now, lastRecheckedAt: now, updatedAt: now,
          ...(info.metrics ? { metrics: mergeMetrics(row.metrics, info.metrics), metricsAt: now } : {}),
        }).where(eq(creatorAccounts.id, row.id));
        report.youtube++;
      }
    }
  }

  const limit = options.podcastLimit ?? PODCASTS_PER_RUN;
  const podcasts = await db.select(select).from(creatorAccounts).innerJoin(creators, eq(creators.id, creatorAccounts.creatorId))
    .where(eq(creatorAccounts.platform, 'podcast'))
    .orderBy(sql`${creatorAccounts.metricsAt} asc nulls first`, asc(creatorAccounts.createdAt));
  const batch = podcasts.slice(0, limit);
  report.podcastsLeft = podcasts.length - batch.length;
  const results = await Promise.allSettled(batch.map(row => sources.podcast({ externalId: row.externalId, url: row.url })));
  const done: string[] = [];
  for (const [index, result] of results.entries()) {
    const row = batch[index];
    if (result.status === 'rejected' || !result.value) { report.failed.push({ creator: row.name, reason: 'Son podcast n’a pas pu être lu sur Apple Podcasts.' }); continue; }
    await db.update(creatorAccounts).set({ metrics: mergeMetrics(row.metrics, result.value), metricsAt: now, lastRecheckedAt: now, updatedAt: now })
      .where(eq(creatorAccounts.id, row.id));
    done.push(row.id);
    report.podcasts++;
  }
  // Un podcast en échec passe quand même en fin de file, pour que les suivants soient relus au prochain clic.
  const failedIds = batch.map(row => row.id).filter(id => !done.includes(id));
  if (failedIds.length) await db.update(creatorAccounts).set({ metricsAt: now }).where(inArray(creatorAccounts.id, failedIds));
  report.failed.sort((a, b) => a.creator.localeCompare(b.creator, 'fr'));
  return report;
}
