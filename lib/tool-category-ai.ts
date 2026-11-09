// « Trouver la catégorie » dans la fiche d'un outil (ADR-0024) : l'IA lit la page d'accueil du site officiel et
// propose une catégorie existante, ou le nom d'une nouvelle quand aucune ne convient. Rien n'est enregistré :
// l'admin choisit, puis valide la fiche. L'appel compte dans le plafond mensuel de l'IA (table ai_usage).
import type { Db } from '@/db';
import { aiUsage } from '@/db/schema';
import { aiStatusOf, type AiConfig } from './ai-extract';
import { readSite } from './site-reader';
import { analyzeTool, type ToolAnalysis } from './tool-analysis';
import { analysisChoices } from './universes-admin';
import { aiSpendSince, startOfMonthUtc } from './verification-store';

type Parsed<T> = { ok: true; data: T } | { ok: false; error: string };

export type CategoryDeps = {
  ai: { config: AiConfig; create: Parameters<typeof analyzeTool>[0] | null };
  readSite?: (url: string) => ReturnType<typeof readSite>;
  now?: Date;
};

export async function suggestToolCategory(db: Db, deps: CategoryDeps, input: { name?: unknown; website?: unknown }): Promise<Parsed<ToolAnalysis>> {
  const website = typeof input.website === 'string' ? input.website.trim().slice(0, 300) : '';
  const name = typeof input.name === 'string' ? input.name.trim().slice(0, 120) : '';
  if (!website) return { ok: false, error: 'Indique d’abord le site officiel de l’outil.' };
  const now = deps.now ?? new Date();
  const status = aiStatusOf(deps.ai.config, await aiSpendSince(db, startOfMonthUtc(now)));
  if (status.state !== 'active' || !deps.ai.create) return { ok: false, error: status.state === 'budget_reached' ? 'Le plafond de l’IA est atteint pour ce mois.' : 'L’IA n’est pas encore activée.' };
  const site = await (deps.readSite ?? readSite)(website);
  if (!site.ok) return { ok: false, error: `${site.error} Choisis la catégorie à la main.` };
  const result = await analyzeTool(deps.ai.create, deps.ai.config.model, { name: name || site.page.title, page: site.page, ...await analysisChoices(db) });
  await db.insert(aiUsage).values({ purpose: 'tool_category', model: deps.ai.config.model, costUsdMicros: result.costUsdMicros, ref: site.page.url.slice(0, 500) });
  if (!result.analysis) return { ok: false, error: result.refused ? 'L’IA a refusé d’analyser ce site.' : 'L’IA n’a pas pu analyser ce site.' };
  return { ok: true, data: result.analysis };
}
