// Statistiques par source et par outil (onglet « Sources et outils » de Statistiques) : sur 30 jours,
// ce que chaque source a trouvé, ce qui a été publié, ce que les visiteurs ont copié, et quels outils ils copient.
import { and, eq, gte, isNull, sql } from 'drizzle-orm';
import type { Db } from '@/db';
import { categories, codes, dailyCounters, tools } from '@/db/schema';
import type { CodeOrigin } from './code-origin';
import { groupBySource, STATS_DAYS, type SourceStats } from './source-groups';

export { groupBySource, sourceLesson, STATS_DAYS, SOURCE_GROUPS, type SourceStats, type SourceYield, type CopiesRow } from './source-groups';

const DAY = 86_400_000;

/**
 * Sur les 30 derniers jours : codes trouvés par source (ajoutés en base), parmi eux ceux publiés (vérifiés ou à tester),
 * et copies de tous les codes de la source. Puis les copies par outil (les 12 premiers) et par catégorie.
 */
export async function sourceStats(db: Db, now = new Date()): Promise<SourceStats> {
  const since = new Date(now.getTime() - STATS_DAYS * DAY);
  const sinceDay = since.toISOString().slice(0, 10);
  const copied = and(eq(dailyCounters.metric, 'copy'), gte(dailyCounters.day, sinceDay), isNull(codes.archivedAt));
  const joinCodes = sql`${dailyCounters.key} = ${codes.id}::text`;
  const copies = sql<number>`coalesce(sum(${dailyCounters.count}), 0)`.mapWith(Number);
  const [found, copiesByOrigin, byTool, byCategory] = await Promise.all([
    db.select({
      origin: codes.origin,
      found: sql<number>`count(*)`.mapWith(Number),
      published: sql<number>`count(*) filter (where ${codes.status} in ('verified', 'to_test'))`.mapWith(Number),
    }).from(codes).where(and(gte(codes.createdAt, since), isNull(codes.archivedAt))).groupBy(codes.origin),
    db.select({ origin: codes.origin, copies }).from(dailyCounters).innerJoin(codes, joinCodes).where(copied).groupBy(codes.origin),
    db.select({ name: tools.name, slug: tools.slug, copies }).from(dailyCounters).innerJoin(codes, joinCodes).innerJoin(tools, eq(tools.id, codes.toolId))
      .where(copied).groupBy(tools.name, tools.slug).orderBy(sql`3 desc`, tools.name).limit(12),
    db.select({ name: categories.name, slug: categories.slug, copies }).from(dailyCounters).innerJoin(codes, joinCodes).innerJoin(tools, eq(tools.id, codes.toolId))
      .innerJoin(categories, eq(categories.slug, tools.categorySlug))
      .where(copied).groupBy(categories.name, categories.slug).orderBy(sql`3 desc`, categories.name),
  ]);
  const origins = new Set<CodeOrigin>([...found.map(row => row.origin), ...copiesByOrigin.map(row => row.origin)]);
  const rows = [...origins].map(origin => ({
    origin,
    found: found.find(row => row.origin === origin)?.found ?? 0,
    published: found.find(row => row.origin === origin)?.published ?? 0,
    copies: copiesByOrigin.find(row => row.origin === origin)?.copies ?? 0,
  }));
  return {
    since: sinceDay, sources: groupBySource(rows), tools: byTool, categories: byCategory,
    totalCopies: copiesByOrigin.reduce((sum, row) => sum + row.copies, 0),
  };
}

