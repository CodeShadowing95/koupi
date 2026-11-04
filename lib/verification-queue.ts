// File de la page Vérifications : les codes qui attendent une décision (en attente ou à tester),
// chacun avec sa dernière analyse. Les dossiers analysés passent devant, du plus sûr au moins sûr,
// pour valider vite ce qui est clair ; les codes jamais analysés suivent, du plus ancien au plus récent.
// S'y ajoutent les retests : codes vérifiés dont une analyse plus récente que le dernier test n'est plus claire,
// ou dont la date de fin est passée depuis le dernier test.
import { and, desc, eq, inArray, isNull, or, sql } from 'drizzle-orm';
import type { Db } from '@/db';
import { codes, creators, tools, verificationChecks } from '@/db/schema';
import { verdictOf, type QueueCheck, type QueueItem } from './verification-display';

export type { QueueCheck, QueueItem } from './verification-display';

export function sortQueue(items: QueueItem[]): QueueItem[] {
  return [...items].sort((a, b) => {
    if (a.check && b.check) return b.check.score - a.check.score || a.createdAt.localeCompare(b.createdAt);
    if (a.check || b.check) return a.check ? -1 : 1;
    return a.createdAt.localeCompare(b.createdAt);
  });
}

export async function verificationQueue(db: Db): Promise<QueueItem[]> {
  const rows = await db.select({
    id: codes.id, code: codes.code, discount: codes.discount, status: codes.status,
    tool: tools.name, creator: creators.name, sourceUrl: codes.sourceUrl, sourceTitle: codes.sourceTitle,
    votesUp: codes.votesUp, votesDown: codes.votesDown, createdAt: codes.createdAt, expiresOn: codes.expiresOn,
    expired: sql<boolean>`coalesce(${codes.expiresOn} < current_date and (${codes.lastTestedAt} is null or ${codes.lastTestedAt}::date <= ${codes.expiresOn}), false)`,
  }).from(codes)
    .innerJoin(tools, eq(codes.toolId, tools.id))
    .innerJoin(creators, eq(codes.creatorId, creators.id))
    .where(and(isNull(codes.archivedAt), or(
      inArray(codes.status, ['pending', 'to_test']),
      // Vérifié, mais relu par une analyse postérieure au dernier test (retest automatique ou manuel).
      and(eq(codes.status, 'verified'), sql`exists (select 1 from ${verificationChecks} where ${verificationChecks.codeId} = ${codes.id} and ${verificationChecks.createdAt} > coalesce(${codes.lastTestedAt}, 'epoch'::timestamptz))`),
      // Vérifié, mais sa date de fin est passée depuis le dernier test.
      and(eq(codes.status, 'verified'), sql`${codes.expiresOn} < current_date and (${codes.lastTestedAt} is null or ${codes.lastTestedAt}::date <= ${codes.expiresOn})`),
    )));
  if (rows.length === 0) return [];

  const checks = await db.select().from(verificationChecks)
    .where(inArray(verificationChecks.codeId, rows.map(row => row.id)))
    .orderBy(desc(verificationChecks.createdAt));
  const latest = new Map<string, QueueCheck>();
  for (const check of checks) {
    if (!check.codeId || latest.has(check.codeId)) continue;
    latest.set(check.codeId, {
      score: check.score, reasons: check.reasons, evidence: check.evidence, model: check.model,
      costUsdMicros: check.costUsdMicros, createdAt: check.createdAt.toISOString(),
    });
  }

  const items = rows.map(row => ({
    ...row,
    status: row.status as QueueItem['status'],
    expired: Boolean(row.expired),
    createdAt: row.createdAt.toISOString(),
    check: latest.get(row.id) ?? null,
  }));
  // Un code vérifié dont la relecture reste claire n'a besoin de rien, sauf si sa date de fin est passée.
  return sortQueue(items.filter(item => item.status !== 'verified' || item.expired || verdictOf(item.check) !== 'clear'));
}
