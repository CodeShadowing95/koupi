// « Depuis ta dernière visite » sur l'accueil admin : ce qui est arrivé depuis une date (gardée dans le navigateur).
import { and, eq, gt, gte, sql } from 'drizzle-orm';
import type { Db } from '@/db';
import { codes, dailyCounters, feedback, submissions } from '@/db/schema';

export type SinceVisit = { codes: number; submissions: number; copies: number; feedback: number };

/** On ne remonte pas plus loin que 60 jours : au-delà, la ligne ne dirait plus rien d'utile. */
export const SINCE_MAX_DAYS = 60;

/** Date de la dernière visite lue dans l'adresse : valide, passée et pas plus vieille que 60 jours. */
export function parseSince(value: string | null, now = new Date()): Date | null {
  if (!value) return null;
  const at = new Date(value);
  if (Number.isNaN(at.getTime()) || at > now) return null;
  const oldest = new Date(now.getTime() - SINCE_MAX_DAYS * 86_400_000);
  return at < oldest ? oldest : at;
}

/** Codes ajoutés (toutes sources), propositions reçues, copies (au jour près) et avis reçus depuis la date. */
export async function sinceVisit(db: Db, since: Date): Promise<SinceVisit> {
  // Les copies sont comptées par jour (heure UTC) : on compte celles du jour de la visite inclus.
  const day = since.toISOString().slice(0, 10);
  const count = sql<number>`count(*)`.mapWith(Number);
  const [[added], [received], [copied], [notes]] = await Promise.all([
    db.select({ n: count }).from(codes).where(gt(codes.createdAt, since)),
    db.select({ n: count }).from(submissions).where(gt(submissions.createdAt, since)),
    db.select({ n: sql<number>`coalesce(sum(${dailyCounters.count}), 0)`.mapWith(Number) }).from(dailyCounters)
      .where(and(eq(dailyCounters.metric, 'copy'), gte(dailyCounters.day, day))),
    db.select({ n: count }).from(feedback).where(gt(feedback.createdAt, since)),
  ]);
  return { codes: added?.n ?? 0, submissions: received?.n ?? 0, copies: copied?.n ?? 0, feedback: notes?.n ?? 0 };
}
