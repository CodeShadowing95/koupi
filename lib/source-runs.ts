// Journal des passages des sources de codes et rendement de chaque source (ADR-0035), pour la page Sources de l'admin.
import { and, desc, eq, gte, isNull, sql } from 'drizzle-orm';
import type { Db } from '@/db';
import { aiUsage, codes, dailyCounters, sourceRuns, submissions, watchedSources } from '@/db/schema';
import { CODE_ORIGINS, type CodeOrigin } from './code-origin';
import { monthStart } from './creator-directory';
import { EMPTY_YIELD, runStatus, type OriginYield, type RunSource, type RunStatus, type RunTrigger } from './sources';
import { startOfMonthUtc } from './verification-store';
import { readableError, readableRunError } from './db-error';

export type RunSummary = { items: number; codes: number; suggested: number; units: number; failed: string[]; attempted: number;
  /** Portée plus précise connue après coup (nom de la catégorie plutôt que son adresse). */
  scope?: string };

/**
 * Lance un passage et l'inscrit au journal, réussi ou non. Une erreur est notée puis relancée :
 * la route qui l'appelle répond comme avant.
 */
export async function recordRun<R>(db: Db, run: { source: RunSource; trigger: RunTrigger; scope: string }, work: () => Promise<R>, summarize: (report: R) => RunSummary | null): Promise<R> {
  const startedAt = new Date();
  try {
    const report = await work();
    const summary = summarize(report);
    // Rien n'a été lu (outil introuvable, aucune source à lire) : pas de ligne au journal.
    if (!summary) return report;
    await db.insert(sourceRuns).values({
      source: run.source, trigger: run.trigger, scope: (summary.scope ?? run.scope).slice(0, 200), status: runStatus(summary, summary.attempted),
      items: summary.items, codes: summary.codes, suggested: summary.suggested, units: summary.units,
      error: summary.failed.length ? `Pas de réponse pour : ${summary.failed.join(', ')}`.slice(0, 500) : null, startedAt, finishedAt: new Date(),
    }).catch(error => console.error('source run log failed', error));
    return report;
  } catch (error) {
    // La cause complète (contrainte, détail de Postgres) va dans les journaux Vercel ; le journal de l'admin garde une phrase lisible.
    console.error('source run failed', run.source, run.scope, error, error instanceof Error ? error.cause : undefined);
    await db.insert(sourceRuns).values({
      source: run.source, trigger: run.trigger, scope: run.scope.slice(0, 200), status: 'failed', error: readableError(error).slice(0, 500), startedAt, finishedAt: new Date(),
    }).catch(logError => console.error('source run log failed', logError));
    throw error;
  }
}

export type RunRow = {
  id: string; source: RunSource; trigger: RunTrigger; scope: string; status: RunStatus;
  items: number; codes: number; suggested: number; units: number; error: string | null; startedAt: string; finishedAt: string;
};

/** Derniers passages, du plus récent au plus ancien. */
export async function listRuns(db: Db, limit = 40): Promise<RunRow[]> {
  const rows = await db.select().from(sourceRuns).orderBy(desc(sourceRuns.startedAt)).limit(limit);
  return rows.map(toRunRow);
}

const toRunRow = (row: typeof sourceRuns.$inferSelect): RunRow => ({
  ...row, error: readableRunError(row.error), startedAt: row.startedAt.toISOString(), finishedAt: row.finishedAt.toISOString(),
});

const AI_PURPOSE: Record<RunSource, string> = { youtube_search: 'category_search', youtube_channel: 'youtube_channel', podcast: 'podcast_notes' };

export type SourceActivity = {
  lastRun: RunRow | null;
  runsThisMonth: number;
  /** Unités du quota YouTube ce mois-ci. */
  unitsThisMonth: number;
  /** Dépense IA de lecture ce mois-ci, en dollars. */
  aiUsdThisMonth: number;
};

/** Activité du mois de chaque source : dernier passage, nombre de passages, quota YouTube et IA dépensés. */
export async function sourceActivity(db: Db, now = new Date()): Promise<Record<RunSource, SourceActivity>> {
  const since = startOfMonthUtc(now);
  const [totals, ai, last] = await Promise.all([
    db.select({ source: sourceRuns.source, runs: sql<number>`count(*)::int`, units: sql<number>`coalesce(sum(${sourceRuns.units}), 0)::int` })
      .from(sourceRuns).where(gte(sourceRuns.startedAt, since)).groupBy(sourceRuns.source),
    db.select({ purpose: aiUsage.purpose, micros: sql<number>`coalesce(sum(${aiUsage.costUsdMicros}), 0)::int` })
      .from(aiUsage).where(gte(aiUsage.createdAt, since)).groupBy(aiUsage.purpose),
    db.selectDistinctOn([sourceRuns.source]).from(sourceRuns).orderBy(sourceRuns.source, desc(sourceRuns.startedAt)),
  ]);
  const result = {} as Record<RunSource, SourceActivity>;
  for (const source of ['youtube_search', 'youtube_channel', 'podcast'] as const) {
    const total = totals.find(row => row.source === source);
    const lastRow = last.find(row => row.source === source);
    result[source] = {
      lastRun: lastRow ? toRunRow(lastRow) : null,
      runsThisMonth: total?.runs ?? 0,
      unitsThisMonth: total?.units ?? 0,
      aiUsdThisMonth: (ai.find(row => row.purpose === AI_PURPOSE[source])?.micros ?? 0) / 1_000_000,
    };
  }
  return result;
}

/** Rendement de chaque origine de codes : trouvés (dont ce mois-ci), publiés, rejetés, en attente, copiés ce mois-ci. Codes archivés exclus. */
export async function yieldByOrigin(db: Db, now = new Date()): Promise<Record<CodeOrigin, OriginYield>> {
  const since = startOfMonthUtc(now);
  const [counts, copies] = await Promise.all([
    db.select({
      origin: codes.origin,
      found: sql<number>`count(*)::int`,
      foundThisMonth: sql<number>`count(*) filter (where ${codes.createdAt} >= ${since.toISOString()})::int`,
      published: sql<number>`count(*) filter (where ${codes.status} in ('verified', 'to_test'))::int`,
      rejected: sql<number>`count(*) filter (where ${codes.status} = 'rejected')::int`,
      waiting: sql<number>`count(*) filter (where ${codes.status} = 'pending')::int`,
    }).from(codes).where(isNull(codes.archivedAt)).groupBy(codes.origin),
    db.select({ origin: codes.origin, copies: sql<number>`coalesce(sum(${dailyCounters.count}), 0)::int` })
      .from(dailyCounters)
      .innerJoin(codes, sql`${dailyCounters.key} = ${codes.id}::text`)
      .where(and(eq(dailyCounters.metric, 'copy'), gte(dailyCounters.day, monthStart(now)), isNull(codes.archivedAt)))
      .groupBy(codes.origin),
  ]);
  const result = Object.fromEntries(CODE_ORIGINS.map(origin => [origin, { ...EMPTY_YIELD }])) as Record<CodeOrigin, OriginYield>;
  for (const row of counts) result[row.origin] = { ...result[row.origin], found: row.found, foundThisMonth: row.foundThisMonth, published: row.published, rejected: row.rejected, waiting: row.waiting };
  for (const row of copies) result[row.origin].copies = row.copies;
  return result;
}

/** Ce qui est suivi : chaînes YouTube et podcasts actifs ou en pause, propositions des visiteurs à traiter. */
export async function sourceInventory(db: Db): Promise<{ channels: { active: number; paused: number }; podcasts: { active: number; paused: number }; submissionsNew: number }> {
  const [watched, [pending]] = await Promise.all([
    db.select({ platform: watchedSources.platform, active: watchedSources.active, n: sql<number>`count(*)::int` }).from(watchedSources).groupBy(watchedSources.platform, watchedSources.active),
    db.select({ n: sql<number>`count(*)::int` }).from(submissions).where(eq(submissions.status, 'new')),
  ]);
  const count = (platform: 'youtube' | 'podcast', active: boolean) => watched.find(row => row.platform === platform && row.active === active)?.n ?? 0;
  return {
    channels: { active: count('youtube', true), paused: count('youtube', false) },
    podcasts: { active: count('podcast', true), paused: count('podcast', false) },
    submissionsNew: pending?.n ?? 0,
  };
}
