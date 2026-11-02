// Retests automatiques (spec « vérifications assistées », étape 7). Chaque nuit, une tâche planifiée Vercel
// relance l'analyse des codes vérifiés dont le dernier test date de plus de RETEST_DAYS jours.
// Rien n'est changé tout seul : un code dont l'analyse n'est plus claire remonte dans l'onglet « Retests »
// de la page Vérifications, et l'admin décide.
import { and, eq, gte, inArray, isNull, lt, or } from 'drizzle-orm';
import type { Db } from '@/db';
import { codes, verificationChecks } from '@/db/schema';
import { RETEST_DAYS } from './admin-stats';
import { runVerification, youtubeVideoId, type RunDeps } from './verification-run';

/** Nombre maximum de codes relus par nuit : garde le quota YouTube et le budget IA sous contrôle. */
export const RETEST_BATCH = 40;

/**
 * Codes à relire : vérifiés, non archivés, testés il y a plus de RETEST_DAYS jours (ou jamais datés),
 * sans analyse depuis RETEST_DAYS jours, et dont la source peut être lue automatiquement (YouTube pour l'instant).
 */
export async function retestCandidates(db: Db, now = new Date(), limit = RETEST_BATCH): Promise<string[]> {
  const since = new Date(now.getTime() - RETEST_DAYS * 86_400_000);
  const rows = await db.select({ id: codes.id, sourceUrl: codes.sourceUrl, lastTestedAt: codes.lastTestedAt }).from(codes)
    .where(and(eq(codes.status, 'verified'), isNull(codes.archivedAt), or(isNull(codes.lastTestedAt), lt(codes.lastTestedAt, since))));
  const readable = rows.filter(row => youtubeVideoId(row.sourceUrl));
  if (readable.length === 0) return [];
  const recent = await db.selectDistinct({ codeId: verificationChecks.codeId }).from(verificationChecks)
    .where(and(inArray(verificationChecks.codeId, readable.map(row => row.id)), gte(verificationChecks.createdAt, since)));
  const done = new Set(recent.map(row => row.codeId));
  return readable
    .filter(row => !done.has(row.id))
    .sort((a, b) => (a.lastTestedAt?.getTime() ?? 0) - (b.lastTestedAt?.getTime() ?? 0))
    .slice(0, limit)
    .map(row => row.id);
}

export type RetestReport = { checked: number; failed: number };

export async function runRetests(db: Db, deps: RunDeps, now = new Date()): Promise<RetestReport> {
  const ids = await retestCandidates(db, now);
  let checked = 0;
  let failed = 0;
  for (const id of ids) {
    try {
      if (await runVerification(db, id, deps)) checked += 1;
    } catch (error) {
      failed += 1;
      console.error('retest failed', id, error);
    }
  }
  return { checked, failed };
}
