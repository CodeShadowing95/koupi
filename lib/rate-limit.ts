import { lt, sql } from 'drizzle-orm';
import type { Db } from '@/db';
import { rateLimits } from '@/db/schema';

export type RateLimitRule = { limit: number; windowSeconds: number };
export type RateLimitResult = { allowed: boolean; retryAfterSeconds: number };

// 5 essais de connexion admin par IP et par quart d'heure, 5 propositions par IP et par heure.
export const LOGIN_RULE: RateLimitRule = { limit: 5, windowSeconds: 15 * 60 };
export const SUBMISSION_RULE: RateLimitRule = { limit: 5, windowSeconds: 60 * 60 };
// Un vote par code et par IP sur 24 h, 30 votes par IP et par heure, 120 mesures d'audience par IP et par heure.
export const VOTE_PER_CODE_RULE: RateLimitRule = { limit: 1, windowSeconds: 24 * 60 * 60 };
export const VOTE_RULE: RateLimitRule = { limit: 30, windowSeconds: 60 * 60 };
export const EVENT_RULE: RateLimitRule = { limit: 120, windowSeconds: 60 * 60 };

// Compte un essai pour cette clé, en une seule requête atomique (pas de course entre deux requêtes simultanées).
// La fenêtre est fixe : elle s'ouvre au premier essai et dure windowSeconds.
export async function consumeRateLimit(db: Db, key: string, rule: RateLimitRule, now = new Date()): Promise<RateLimitResult> {
  const windowStartLimit = new Date(now.getTime() - rule.windowSeconds * 1000);
  const expired = sql`${rateLimits.windowStart} <= ${windowStartLimit.toISOString()}::timestamptz`;
  const [row] = await db.insert(rateLimits)
    .values({ key, count: 1, windowStart: now })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        count: sql`case when ${expired} then 1 else ${rateLimits.count} + 1 end`,
        windowStart: sql`case when ${expired} then ${now.toISOString()}::timestamptz else ${rateLimits.windowStart} end`,
      },
    })
    .returning({ count: rateLimits.count, windowStart: rateLimits.windowStart });

  if (row.count <= rule.limit) return { allowed: true, retryAfterSeconds: 0 };
  const resetAt = row.windowStart.getTime() + rule.windowSeconds * 1000;
  return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((resetAt - now.getTime()) / 1000)) };
}

// Supprime les compteurs de plus d'un jour, pour que la table reste petite.
export async function pruneRateLimits(db: Db, now = new Date()): Promise<void> {
  await db.delete(rateLimits).where(lt(rateLimits.windowStart, new Date(now.getTime() - 24 * 60 * 60 * 1000)));
}
