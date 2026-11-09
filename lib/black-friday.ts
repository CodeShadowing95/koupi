// Page « Codes promo Black Friday » (/black-friday) : une adresse fixe, mise à jour chaque année, qui montre le meilleur
// code de créateur de chaque outil. Les codes des créateurs ne sont pas des offres Black Friday : la page le dit.
import type { Code, Family, Tool } from './data';
import { isPublic } from './data';
import { sortToolCodes } from './tool-page';

/** Black Friday : le lendemain du 4e jeudi de novembre (Thanksgiving), à minuit UTC. */
export function blackFridayDate(year: number): Date {
  const first = new Date(Date.UTC(year, 10, 1)).getUTCDay();
  const firstThursday = 1 + ((4 - first + 7) % 7);
  return new Date(Date.UTC(year, 10, firstThursday + 21 + 1));
}

/** Cyber Monday : trois jours après le Black Friday. */
export function cyberMondayDate(year: number): Date {
  const friday = blackFridayDate(year);
  return new Date(friday.getTime() + 3 * 86_400_000);
}

/** « vendredi 27 novembre 2026 ». */
export function frenchDay(date: Date): string {
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date);
}

export type BlackFridayGroup = { family: Family | null; picks: { code: Code; tool: Tool }[] };

/**
 * Le meilleur code public de chaque outil (vérifié et pas expiré d'abord, puis taux de réussite), rangé par famille
 * dans l'ordre des familles, les outils les plus suivis d'abord. Les outils hors famille finissent dans un dernier groupe.
 */
export function bestCodesByFamily(codes: Code[], tools: Tool[], families: Family[], now?: Date): BlackFridayGroup[] {
  const byTool = new Map<string, Code[]>();
  for (const code of codes) if (isPublic(code)) byTool.set(code.toolSlug, [...(byTool.get(code.toolSlug) ?? []), code]);
  const picks = tools
    .filter(tool => byTool.has(tool.slug))
    .map(tool => ({ tool, code: sortToolCodes(byTool.get(tool.slug)!, now)[0] }))
    .sort((a, b) => b.code.success - a.code.success || b.code.votes - a.code.votes || a.tool.name.localeCompare(b.tool.name, 'fr'));
  const groups: BlackFridayGroup[] = families
    .map(family => ({ family, picks: picks.filter(pick => pick.tool.family === family.slug) }))
    .filter(group => group.picks.length > 0);
  const known = new Set(families.map(family => family.slug));
  const loose = picks.filter(pick => !pick.tool.family || !known.has(pick.tool.family));
  return loose.length ? [...groups, { family: null, picks: loose }] : groups;
}
