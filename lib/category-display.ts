import type { Code, Tool } from './data';

/**
 * Les meilleurs codes d'une catégorie pour le présentoir de l'accueil :
 * un seul code par outil, du plus fiable (taux de réussite, puis votes) au moins fiable.
 * `codes` doit déjà être filtré sur les codes visibles du site.
 */
export function topCodesFor(categoryName: string, tools: Tool[], codes: Code[], limit = 3): Code[] {
  const slugs = new Set(tools.filter(tool => tool.category === categoryName).map(tool => tool.slug));
  const sorted = codes
    .filter(code => slugs.has(code.toolSlug))
    .sort((a, b) => b.success - a.success || b.votes - a.votes);
  return sorted.filter((code, index) => sorted.findIndex(other => other.toolSlug === code.toolSlug) === index).slice(0, limit);
}
