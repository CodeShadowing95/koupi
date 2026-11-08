// « Ranger la catégorie » : l'IA relit le site de chaque outil d'une catégorie et dit où il irait mieux.
// Sans base ni réseau : importable par les composants client. Rien n'est déplacé sans le clic de l'admin.
import type { ToolAnalysis } from './tool-analysis';
import { slugify } from './slug';

export type TidyVerdict =
  /** L'outil est à sa place. */
  | { kind: 'stay' }
  /** Une autre catégorie existante convient mieux. */
  | { kind: 'move'; slug: string; reason: string }
  /** Aucune catégorie ne convient : l'IA en propose une nouvelle. */
  | { kind: 'create'; name: string; reason: string }
  /** L'IA ne tranche pas : on laisse l'outil où il est. */
  | { kind: 'unsure' };

/**
 * Où ranger un outil d'après la lecture de son site. Une « nouvelle » catégorie qui existe déjà sous ce nom
 * devient un déplacement vers elle, et une nouvelle catégorie qui porte le nom de la catégorie actuelle veut dire « reste ».
 */
export function tidyVerdict(currentSlug: string, analysis: ToolAnalysis, categories: { slug: string; name: string }[]): TidyVerdict {
  const reason = analysis.reason;
  if (analysis.categorySlug) {
    return analysis.categorySlug === currentSlug ? { kind: 'stay' } : { kind: 'move', slug: analysis.categorySlug, reason };
  }
  const name = analysis.newCategory.trim();
  if (!name) return { kind: 'unsure' };
  const existing = categories.find(category => slugify(category.name) === slugify(name));
  if (existing) return existing.slug === currentSlug ? { kind: 'stay' } : { kind: 'move', slug: existing.slug, reason };
  return { kind: 'create', name, reason };
}

/** Coût estimé d'une relecture, en centimes (environ 0,1 centime par outil avec Haiku). */
export function tidyCostCents(tools: number): number {
  return Math.round(tools * 0.1 * 10) / 10;
}
