// File de la page Vérifications : les codes qui attendent une décision (en attente ou à tester),
// chacun avec sa dernière analyse. Les dossiers analysés passent devant, du plus sûr au moins sûr,
// pour valider vite ce qui est clair ; les codes jamais analysés suivent, du plus ancien au plus récent.
// S'y ajoutent les retests : codes vérifiés dont une analyse plus récente que le dernier test n'est plus claire,
// ou dont la date de fin est passée depuis le dernier test.
import { and, desc, eq, inArray, isNull, or, sql } from 'drizzle-orm';
import type { Db } from '@/db';
import { codes, creators, tools, verificationChecks } from '@/db/schema';
import { verdictOf, type QueueCheck, type QueueItem } from './verification-display';
import { notAToolName } from './podcast-codes';
import { slugify } from './slug';

export type { QueueCheck, QueueItem } from './verification-display';

export function sortQueue(items: QueueItem[]): QueueItem[] {
  return [...items].sort((a, b) => {
    if (a.check && b.check) return b.check.score - a.check.score || a.createdAt.localeCompare(b.createdAt);
    if (a.check || b.check) return a.check ? -1 : 1;
    return a.createdAt.localeCompare(b.createdAt);
  });
}

/** Les codes lus par l'IA (au plus 3, sans doublon), sans le code actuel. */
export function aiCodesOf(extracted: unknown, current: string): string[] {
  const found = (extracted as { codes?: { code?: unknown }[] } | null)?.codes ?? [];
  const codes = found.map(item => typeof item?.code === 'string' ? item.code.trim().toUpperCase() : '').filter(code => code && code !== current.toUpperCase());
  return [...new Set(codes)].slice(0, 3);
}

/**
 * Marque à laquelle l'IA rattache le code actuel, quand ce n'est pas l'outil du code (ni une étiquette comme
 * « Avantages ») : l'admin peut alors rattacher le code à cet outil depuis le dossier.
 */
export function aiToolOf(extracted: unknown, current: string, toolName: string): string | null {
  if (!current) return null;
  const found = (extracted as { codes?: { code?: unknown; tool?: unknown }[] } | null)?.codes ?? [];
  const item = found.find(entry => typeof entry?.code === 'string' && entry.code.trim().toUpperCase() === current.toUpperCase());
  const tool = typeof item?.tool === 'string' ? item.tool.trim() : '';
  if (!tool || notAToolName(tool)) return null;
  const a = slugify(tool), b = slugify(toolName);
  return a && b && (a.includes(b) || b.includes(a)) ? null : tool.slice(0, 80);
}

export async function verificationQueue(db: Db): Promise<QueueItem[]> {
  const rows = await db.select({
    id: codes.id, code: sql<string>`coalesce(${codes.code}, '')`, offerLink: codes.creatorLink, discount: codes.discount, status: codes.status,
    tool: tools.name, toolSlug: tools.slug, creator: creators.name, sourceUrl: codes.sourceUrl, sourceTitle: codes.sourceTitle,
    votesUp: codes.votesUp, votesDown: codes.votesDown, createdAt: codes.createdAt, expiresOn: codes.expiresOn, origin: codes.origin,
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
  const codeOf = new Map(rows.map(row => [row.id, row.code.toUpperCase()]));
  const toolOf = new Map(rows.map(row => [row.id, row.tool]));
  for (const check of checks) {
    if (!check.codeId || latest.has(check.codeId)) continue;
    latest.set(check.codeId, {
      score: check.score, reasons: check.reasons, evidence: check.evidence, model: check.model,
      costUsdMicros: check.costUsdMicros, createdAt: check.createdAt.toISOString(),
      aiCodes: aiCodesOf(check.extracted, codeOf.get(check.codeId) ?? ''),
      aiTool: aiToolOf(check.extracted, codeOf.get(check.codeId) ?? '', toolOf.get(check.codeId) ?? ''),
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
