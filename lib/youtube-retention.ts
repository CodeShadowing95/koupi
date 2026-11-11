// Règle des 30 jours de l'API YouTube (YouTube API Services Developer Policies, III.E.4) : les données lues sans
// l'autorisation du créateur (photo de chaîne, nombre d'abonnés, vues…) doivent être actualisées ou effacées
// au plus tard 30 jours après leur lecture. Une tâche planifiée les actualise chaque semaine (ADR-0049), puis efface
// ce qui n'a pas pu l'être : une chaîne supprimée ou devenue illisible ne laisse rien de périmé derrière elle.
import { and, eq, inArray, isNotNull, lt } from 'drizzle-orm';
import type { Db } from '@/db';
import { creatorAccounts, storedImages } from '@/db/schema';
import { hostAllowed, YOUTUBE_IMAGE_HOSTS } from './stored-images';

export const YOUTUBE_RETENTION_DAYS = 30;

/** La date avant laquelle une donnée YouTube est périmée. */
export function retentionCutoff(now: Date): Date {
  return new Date(now.getTime() - YOUTUBE_RETENTION_DAYS * 24 * 60 * 60 * 1000);
}

/**
 * Efface les données YouTube de plus de 30 jours : abonnés et mesures des chaînes, photos des créateurs venues
 * d'une chaîne YouTube. Les pochettes de podcasts (Apple) ne sont pas concernées.
 */
export async function purgeStaleYoutubeData(db: Db, now = new Date()): Promise<{ accounts: number; photos: number }> {
  const cutoff = retentionCutoff(now);
  const youtube = eq(creatorAccounts.platform, 'youtube');
  const subscribers = await db.update(creatorAccounts).set({ subscribers: null, subscribersAt: null, updatedAt: now })
    .where(and(youtube, isNotNull(creatorAccounts.subscribersAt), lt(creatorAccounts.subscribersAt, cutoff)))
    .returning({ id: creatorAccounts.id });
  const metrics = await db.update(creatorAccounts).set({ metrics: {}, metricsAt: null, updatedAt: now })
    .where(and(youtube, isNotNull(creatorAccounts.metricsAt), lt(creatorAccounts.metricsAt, cutoff)))
    .returning({ id: creatorAccounts.id });
  const old = await db.select({ id: storedImages.id, sourceUrl: storedImages.sourceUrl }).from(storedImages)
    .where(and(isNotNull(storedImages.creatorId), lt(storedImages.fetchedAt, cutoff)));
  const stale = old.filter(row => hostAllowed(row.sourceUrl, YOUTUBE_IMAGE_HOSTS)).map(row => row.id);
  if (stale.length) await db.delete(storedImages).where(inArray(storedImages.id, stale));
  return { accounts: new Set([...subscribers, ...metrics].map(row => row.id)).size, photos: stale.length };
}
