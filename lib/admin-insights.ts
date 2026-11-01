// Indicateurs du back-office tirés de la base : file des propositions, délai de modération,
// propositions par semaine et journal récent. Les calculs sont des fonctions pures, testées à part.
import { and, desc, eq, gte, isNotNull, sql } from 'drizzle-orm';
import type { Db } from '@/db';
import { codeLogs, codes, moderationLogs, submissions, tools, type Submission } from '@/db/schema';

export const PERIODS = [7, 30, 90, 365] as const;
export type Period = typeof PERIODS[number];
export function isPeriod(value: number): value is Period { return (PERIODS as readonly number[]).includes(value); }

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/** Lundi 00:00 UTC de la semaine qui contient la date. */
export function weekStart(date: Date): Date {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  return start;
}

export type WeekBucket = { start: string; approved: number; closed: number; pending: number };

/** Propositions reçues par semaine, de la plus ancienne à la plus récente, semaines vides comprises. */
export function weeklyBuckets(rows: { createdAt: Date; status: Submission['status'] }[], weeks: number, now: Date): WeekBucket[] {
  const last = weekStart(now);
  const buckets: WeekBucket[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(last.getTime() - i * 7 * DAY);
    buckets.push({ start: start.toISOString().slice(0, 10), approved: 0, closed: 0, pending: 0 });
  }
  const index = new Map(buckets.map((bucket, i) => [bucket.start, i]));
  for (const row of rows) {
    const i = index.get(weekStart(row.createdAt).toISOString().slice(0, 10));
    if (i === undefined) continue;
    if (row.status === 'approved') buckets[i].approved += 1;
    else if (row.status === 'new') buckets[i].pending += 1;
    else buckets[i].closed += 1;
  }
  return buckets;
}

/** kind : décision sur une proposition, ou action sur un code du catalogue. */
export type Activity = { id: string; kind: 'submission' | 'code'; action: string; nextStatus: string; code: string | null; tool: string | null; at: string };

export type Insights = {
  period: Period;
  pending: number;
  received: number;
  medianDelayHours: number | null;
  weekly: WeekBucket[];
  recent: Activity[];
};

export async function adminInsights(db: Db, period: Period, now = new Date()): Promise<Insights> {
  const since = new Date(now.getTime() - period * DAY);
  const weeks = Math.min(12, Math.max(4, Math.ceil(period / 7)));
  const weeklySince = new Date(weekStart(now).getTime() - (weeks - 1) * 7 * DAY);

  const [[pendingRow], reviewed, received, recentRows, codeRows] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(submissions).where(eq(submissions.status, 'new')),
    db.select({ createdAt: submissions.createdAt, reviewedAt: submissions.reviewedAt }).from(submissions)
      .where(and(isNotNull(submissions.reviewedAt), gte(submissions.reviewedAt, since))),
    db.select({ createdAt: submissions.createdAt, status: submissions.status }).from(submissions)
      .where(gte(submissions.createdAt, weeklySince < since ? weeklySince : since)),
    db.select({ id: moderationLogs.id, action: moderationLogs.action, nextStatus: moderationLogs.nextStatus, at: moderationLogs.createdAt, code: submissions.code, tool: submissions.toolName })
      .from(moderationLogs).leftJoin(submissions, eq(moderationLogs.submissionId, submissions.id))
      .orderBy(desc(moderationLogs.createdAt)).limit(6),
    db.select({ id: codeLogs.id, action: codeLogs.action, nextStatus: codeLogs.nextStatus, at: codeLogs.createdAt, code: codes.code, tool: tools.name })
      .from(codeLogs).innerJoin(codes, eq(codeLogs.codeId, codes.id)).innerJoin(tools, eq(codes.toolId, tools.id))
      .orderBy(desc(codeLogs.createdAt)).limit(6),
  ]);

  const delays = reviewed.filter(row => row.reviewedAt).map(row => (row.reviewedAt!.getTime() - row.createdAt.getTime()) / HOUR);
  const delay = median(delays);
  return {
    period,
    pending: pendingRow?.count ?? 0,
    received: received.filter(row => row.createdAt >= since).length,
    medianDelayHours: delay === null ? null : Math.round(delay * 10) / 10,
    weekly: weeklyBuckets(received, weeks, now),
    recent: [
      ...recentRows.map(row => ({ id: row.id, kind: 'submission' as const, action: row.action, nextStatus: row.nextStatus, code: row.code, tool: row.tool, at: row.at.toISOString() })),
      ...codeRows.map(row => ({ id: row.id, kind: 'code' as const, action: row.action, nextStatus: row.nextStatus, code: row.code, tool: row.tool, at: row.at.toISOString() })),
    ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 6),
  };
}
