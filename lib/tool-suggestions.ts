// Outils à ajouter : codes repérés dans les podcasts pour des outils absents du catalogue (ADR-0018).
// Ajouter l'outil (nouveau ou déjà au catalogue sous un autre nom) crée le code en attente, et ceux des autres
// suggestions du même outil, pour la page Vérifications. Ignorer garde la trace : la suggestion ne revient pas.
import { and, asc, desc, eq, or, sql } from 'drizzle-orm';
import type { Db } from '@/db';
import { categories, creators, toolSuggestions, tools, watchedSources } from '@/db/schema';
import { aiStatusOf, type AiConfig } from './ai-extract';
import { createCategory, createTool, type ToolInput } from './catalog-admin';
import { readSite, type SitePage } from './site-reader';
import { analyzeTool, type ToolAnalysis } from './tool-analysis';
import { DEFAULT_UNIVERSE } from './universes';
import { analysisChoices, homeFamily } from './universes-admin';
import { aiSpendSince, startOfMonthUtc } from './verification-store';
import { resolveCreator } from './codes-admin';
import { addPodcastCode } from './podcast-read';
import { CREATOR_SUGGESTION_EVIDENCE, suggestionOrigin } from './code-origin';
import { domainOf } from './podcast-codes';

type Parsed<T> = { ok: true; data: T } | { ok: false; error: string };

export type AdminToolSuggestion = {
  /** code '' : offre donnée seulement par son lien (link). */
  id: string; name: string; domain: string | null; code: string; link: string | null; discount: string; evidence: string;
  sourceUrl: string; sourceTitle: string; podcastTitle: string | null; creatorName: string | null; createdAt: string;
  analysis: ToolAnalysis | null; analyzedAt: string | null;
  /** Outil du catalogue qui porte déjà ce nom ou ce site : il suffit d'y relier le code. archived : à restaurer d'abord. */
  existing: { slug: string; name: string; archived: boolean } | null;
};

const nameKey = (name: string) => name.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

export async function listToolSuggestions(db: Db): Promise<AdminToolSuggestion[]> {
  const rows = await db.select({ row: toolSuggestions, podcastTitle: watchedSources.title, creatorName: creators.name })
    .from(toolSuggestions)
    .leftJoin(watchedSources, eq(watchedSources.id, toolSuggestions.podcastId))
    .leftJoin(creators, eq(creators.id, toolSuggestions.creatorId))
    .where(eq(toolSuggestions.status, 'open'))
    .orderBy(desc(toolSuggestions.createdAt));
  const catalog = rows.length ? await db.select({ slug: tools.slug, name: tools.name, website: tools.website, archivedAt: tools.archivedAt }).from(tools) : [];
  // Un outil actif passe avant un outil archivé du même nom.
  const known = catalog.sort((a, b) => Number(Boolean(a.archivedAt)) - Number(Boolean(b.archivedAt)));
  const existingFor = (name: string, domain: string | null) => {
    const tool = known.find(item => (domain && domainOf(item.website) === domain) || (nameKey(item.name) && nameKey(item.name) === nameKey(name)));
    return tool ? { slug: tool.slug, name: tool.name, archived: Boolean(tool.archivedAt) } : null;
  };
  return rows.map(({ row, podcastTitle, creatorName }) => ({
    id: row.id, name: row.name, domain: row.domain, code: row.code ?? '', link: row.link, discount: row.discount, evidence: row.evidence,
    sourceUrl: row.sourceUrl, sourceTitle: row.sourceTitle, podcastTitle, creatorName, createdAt: row.createdAt.toISOString(),
    analysis: row.analysis ?? null, analyzedAt: row.analyzedAt?.toISOString() ?? null,
    existing: existingFor(row.name, row.domain),
  }));
}

export async function ignoreToolSuggestion(db: Db, id: string): Promise<boolean> {
  const rows = await db.update(toolSuggestions).set({ status: 'ignored', resolvedAt: new Date() })
    .where(and(eq(toolSuggestions.id, id), eq(toolSuggestions.status, 'open'))).returning({ id: toolSuggestions.id });
  return rows.length > 0;
}

/**
 * newCategory : nom d'une catégorie à créer pour l'outil (réutilisée si elle existe déjà sous ce nom).
 * universe : l'univers où créer cette nouvelle catégorie (dans sa famille d'accueil) ; sans lui, elle reste sans famille,
 * donc dans « Outils en ligne ».
 */
export type AcceptTarget = { newTool: ToolInput; newCategory?: string; universe?: string } | { toolSlug: string };

/**
 * Ajoute l'outil d'une suggestion (ou la relie à un outil existant) et crée en attente les codes de toutes les
 * suggestions ouvertes du même outil (même domaine, ou même nom sans domaine). Rend les codes créés.
 */
export async function acceptToolSuggestion(db: Db, id: string, target: AcceptTarget): Promise<Parsed<{ toolId: string; codeIds: string[] }>> {
  const [suggestion] = await db.select().from(toolSuggestions).where(and(eq(toolSuggestions.id, id), eq(toolSuggestions.status, 'open'))).limit(1);
  if (!suggestion) return { ok: false, error: 'Suggestion introuvable ou déjà traitée.' };

  let toolId: string;
  if ('newTool' in target) {
    const input = { ...target.newTool };
    const name = target.newCategory?.trim();
    if (name) {
      const [existing] = await db.select({ slug: categories.slug }).from(categories).where(sql`lower(${categories.name}) = lower(${name})`).limit(1);
      if (existing) input.categorySlug = existing.slug;
      else {
        const universe = target.universe && target.universe !== DEFAULT_UNIVERSE ? target.universe : '';
        const family = universe ? await homeFamily(db, universe) : null;
        if (universe && !family) return { ok: false, error: 'Univers introuvable.' };
        const category = await createCategory(db, name, family?.slug);
        if (!category.ok) return category;
        input.categorySlug = category.data.slug;
      }
    }
    const created = await createTool(db, input);
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
    // Offre donnée par le créateur depuis son Studio (ADR-0043) : elle garde son origin « Donné par le créateur ».
    const fromStudio = row.evidence === CREATOR_SUGGESTION_EVIDENCE;
    const codeId = await addPodcastCode(db, {
      toolId, creatorId, code: row.code ?? '', link: row.link ?? undefined, discount: row.discount, sourceUrl: row.sourceUrl, sourceTitle: row.sourceTitle,
      note: fromStudio ? 'Ajouté par le créateur depuis son Studio, pour un outil pas encore sur Merkod.' : `Trouvé dans le podcast ${podcast} : « ${row.evidence} »`,
      podcastTitle: fromStudio ? 'Studio du créateur' : podcast, origin: fromStudio ? 'creator' : suggestionOrigin(row.sourceUrl),
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


/** Description collée par l'admin : assez longue pour dire ce que fait l'outil, coupée pour garder l'appel bon marché. */
export const MIN_DESCRIPTION = 30;
export const MAX_DESCRIPTION = 4000;
const PASTE_HINT = 'Copie ce que fait l’outil (sur son site ou sur Google), colle-le dans « Ce que fait l’outil » et relance l’analyse.';

export type AnalyzeDeps = {
  ai: { config: AiConfig; create: Parameters<typeof analyzeTool>[0] | null };
  readSite?: (url: string) => ReturnType<typeof readSite>;
  now?: Date;
};

/**
 * Fait lire le site d'une suggestion par l'IA (ADR-0024) : résumé et catégorie proposée, gardés sur la suggestion.
 * website : le site à lire quand l'admin l'a corrigé, sinon le domaine trouvé dans les notes.
 * description : ce que fait l'outil, collé par l'admin (site qui refuse les robots, page vide) : l'IA lit ce texte
 * à la place du site.
 */
export async function analyzeToolSuggestion(db: Db, id: string, deps: AnalyzeDeps, { website, description }: { website?: string; description?: string } = {}): Promise<Parsed<ToolAnalysis>> {
  const [suggestion] = await db.select().from(toolSuggestions).where(and(eq(toolSuggestions.id, id), eq(toolSuggestions.status, 'open'))).limit(1);
  if (!suggestion) return { ok: false, error: 'Suggestion introuvable ou déjà traitée.' };
  const now = deps.now ?? new Date();
  const status = aiStatusOf(deps.ai.config, await aiSpendSince(db, startOfMonthUtc(now)));
  if (status.state !== 'active' || !deps.ai.create) return { ok: false, error: status.state === 'budget_reached' ? 'Le plafond de l’IA est atteint pour ce mois.' : 'L’IA n’est pas encore activée.' };
  const target = website?.trim() || suggestion.domain;
  const pasted = (description ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_DESCRIPTION);
  if (pasted && pasted.length < MIN_DESCRIPTION) return { ok: false, error: `La description est trop courte : colle au moins une phrase sur ce que fait l’outil (${MIN_DESCRIPTION} caractères).` };

  let page: SitePage;
  if (pasted) {
    page = { url: target || 'non indiquée', title: '', description: '', text: pasted };
  } else {
    if (!target) return { ok: false, error: 'Indique d’abord le site de l’outil, ou colle sa description.' };
    const site = await (deps.readSite ?? readSite)(target);
    if (!site.ok) return { ok: false, error: `${site.error} ${PASTE_HINT}` };
    page = site.page;
  }
  const choices = await analysisChoices(db);
  const result = await analyzeTool(deps.ai.create, deps.ai.config.model, { name: suggestion.name, page, ...choices, pasted: Boolean(pasted) });
  await db.update(toolSuggestions).set({
    analysisCostUsdMicros: sql`${toolSuggestions.analysisCostUsdMicros} + ${result.costUsdMicros}`,
    analyzedAt: now,
    ...(result.analysis ? { analysis: result.analysis } : {}),
  }).where(eq(toolSuggestions.id, id));
  if (!result.analysis) return { ok: false, error: result.refused ? 'L’IA a refusé d’analyser ce site.' : 'L’IA n’a pas pu analyser ce site.' };
  return { ok: true, data: result.analysis };
}
