// Outils à ajouter : codes repérés dans les podcasts pour des outils absents du catalogue (ADR-0018).
// Ajouter l'outil (nouveau ou déjà au catalogue sous un autre nom) crée le code en attente, et ceux des autres
// suggestions du même outil, pour la page Vérifications. Ignorer garde la trace : la suggestion ne revient pas.
import { and, desc, eq, or, sql } from 'drizzle-orm';
import type { Db } from '@/db';
import { creators, toolSuggestions, tools, watchedSources } from '@/db/schema';
import { createTool, type ToolInput } from './catalog-admin';
import { resolveCreator } from './codes-admin';
import { addPodcastCode } from './podcast-read';

type Parsed<T> = { ok: true; data: T } | { ok: false; error: string };

export type AdminToolSuggestion = {
  id: string; name: string; domain: string | null; code: string; discount: string; evidence: string;
  sourceUrl: string; sourceTitle: string; podcastTitle: string | null; creatorName: string | null; createdAt: string;
};

export async function listToolSuggestions(db: Db): Promise<AdminToolSuggestion[]> {
  const rows = await db.select({ row: toolSuggestions, podcastTitle: watchedSources.title, creatorName: creators.name })
    .from(toolSuggestions)
    .leftJoin(watchedSources, eq(watchedSources.id, toolSuggestions.podcastId))
    .leftJoin(creators, eq(creators.id, toolSuggestions.creatorId))
    .where(eq(toolSuggestions.status, 'open'))
    .orderBy(desc(toolSuggestions.createdAt));
  return rows.map(({ row, podcastTitle, creatorName }) => ({
    id: row.id, name: row.name, domain: row.domain, code: row.code, discount: row.discount, evidence: row.evidence,
    sourceUrl: row.sourceUrl, sourceTitle: row.sourceTitle, podcastTitle, creatorName, createdAt: row.createdAt.toISOString(),
  }));
}

export async function ignoreToolSuggestion(db: Db, id: string): Promise<boolean> {
  const rows = await db.update(toolSuggestions).set({ status: 'ignored', resolvedAt: new Date() })
    .where(and(eq(toolSuggestions.id, id), eq(toolSuggestions.status, 'open'))).returning({ id: toolSuggestions.id });
  return rows.length > 0;
}

export type AcceptTarget = { newTool: ToolInput } | { toolSlug: string };

/**
 * Ajoute l'outil d'une suggestion (ou la relie à un outil existant) et crée en attente les codes de toutes les
 * suggestions ouvertes du même outil (même domaine, ou même nom sans domaine). Rend les codes créés.
 */
export async function acceptToolSuggestion(db: Db, id: string, target: AcceptTarget): Promise<Parsed<{ toolId: string; codeIds: string[] }>> {
  const [suggestion] = await db.select().from(toolSuggestions).where(and(eq(toolSuggestions.id, id), eq(toolSuggestions.status, 'open'))).limit(1);
  if (!suggestion) return { ok: false, error: 'Suggestion introuvable ou déjà traitée.' };

  let toolId: string;
  if ('newTool' in target) {
    const created = await createTool(db, target.newTool);
    if (!created.ok) return created;
    toolId = created.data.id;
  } else {
    const [tool] = await db.select({ id: tools.id }).from(tools).where(and(eq(tools.slug, target.toolSlug), sql`${tools.archivedAt} is null`)).limit(1);
    if (!tool) return { ok: false, error: 'Outil introuvable.' };
    toolId = tool.id;
  }

  const sameTool = suggestion.domain
    ? eq(toolSuggestions.domain, suggestion.domain)
    : and(sql`${toolSuggestions.domain} is null`, sql`lower(${toolSuggestions.name}) = lower(${suggestion.name})`);
  const group = await db.select({ row: toolSuggestions, podcastTitle: watchedSources.title }).from(toolSuggestions)
    .leftJoin(watchedSources, eq(watchedSources.id, toolSuggestions.podcastId))
    .where(and(eq(toolSuggestions.status, 'open'), or(eq(toolSuggestions.id, id), sameTool)));

  const codeIds: string[] = [];
  const now = new Date();
  for (const { row, podcastTitle } of group) {
    const podcast = podcastTitle ?? 'inconnu';
    const creatorId = row.creatorId ?? await resolveCreator(db, podcast);
    const codeId = await addPodcastCode(db, {
      toolId, creatorId, code: row.code, discount: row.discount, sourceUrl: row.sourceUrl, sourceTitle: row.sourceTitle,
      note: `Trouvé dans le podcast ${podcast} : « ${row.evidence} »`, podcastTitle: podcast,
    });
    if (codeId) codeIds.push(codeId);
    await db.update(toolSuggestions).set({ status: 'added', toolId, codeId, resolvedAt: now }).where(eq(toolSuggestions.id, row.id));
  }
  return { ok: true, data: { toolId, codeIds } };
}

/** Nombre de suggestions ouvertes, pour l'onglet. */
export async function openToolSuggestionCount(db: Db): Promise<number> {
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(toolSuggestions).where(eq(toolSuggestions.status, 'open'));
  return row?.n ?? 0;
}

