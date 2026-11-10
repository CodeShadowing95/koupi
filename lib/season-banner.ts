// Bannière saisonnière d'Explorer : Black Friday du 1er novembre au Cyber Monday, Noël jusqu'au 25 décembre, puis les
// soldes d'hiver jusqu'à leur dernier jour. Elle mène à la page de la saison (/black-friday, /noel, /soldes) et montre quelques vrais outils avec leur réduction.
import { blackFridayDate, cyberMondayDate } from './black-friday';
import { christmasDate } from './christmas';
import { winterSalesEnd, winterSalesStart } from './sales';

export type Season = { kind: 'black-friday' | 'christmas' | 'sales'; year: number; /** Jours avant le jour J, 0 le jour même ou après. */ daysLeft: number };

const DAY = 86_400_000;
const dayStart = (date: Date) => Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());

/** Jours entiers avant la date (minuit UTC), 0 le jour même ou après. */
export function daysUntil(target: Date, now: Date): number {
  return Math.max(0, Math.round((target.getTime() - dayStart(now)) / DAY));
}

export function currentSeason(now: Date): Season | null {
  const year = now.getUTCFullYear();
  const today = dayStart(now);
  const friday = blackFridayDate(year).getTime();
  const monday = cyberMondayDate(year).getTime();
  const christmas = christmasDate(year).getTime();
  const daysLeft = (target: number) => Math.max(0, Math.round((target - today) / DAY));
  if (today >= Date.UTC(year, 10, 1) && today <= monday) return { kind: 'black-friday', year, daysLeft: daysLeft(friday) };
  if (today > monday && today <= christmas) return { kind: 'christmas', year, daysLeft: daysLeft(christmas) };
  // Les soldes de janvier : annoncés dès le lendemain de Noël, montrés jusqu'à leur dernier jour.
  const sales = today > christmas ? year + 1 : year;
  if (today > christmas || today <= winterSalesEnd(sales).getTime()) return { kind: 'sales', year: sales, daysLeft: daysLeft(winterSalesStart(sales).getTime()) };
  return null;
}

/** Clé du stockage local : la bannière fermée reste fermée pour cette saison, et revient l'année suivante. */
export const seasonDismissKey = (season: Season) => `merkod-season-${season.kind}-${season.year}`;

export type BannerPick = { toolSlug: string; tool: string; discount: string };

const shortDiscount = (text: string) => (text.length > 18 ? `${text.slice(0, 18).trimEnd()}…` : text);

/**
 * Les outils montrés sur la bannière : le code le plus fiable de chaque outil, les plus fiables d'abord,
 * une famille à la fois tant qu'il en reste une autre (pour ne pas montrer quatre VPN).
 */
export function bannerPicks(codes: { toolSlug: string; tool: string; success: number; discount: string; family?: string }[], count: number): BannerPick[] {
  const best = new Map<string, (typeof codes)[number]>();
  for (const code of codes) if ((best.get(code.toolSlug)?.success ?? -1) < code.success) best.set(code.toolSlug, code);
  // Une réduction chiffrée et courte (« -20 % », « 2 mois offerts ») se lit d'un coup d'œil : elle passe devant.
  const striking = (code: (typeof codes)[number]) => (/\d/.test(code.discount) && code.discount.length <= 18 ? 1 : 0);
  const ranked = [...best.values()].sort((a, b) => striking(b) - striking(a) || b.success - a.success || a.tool.localeCompare(b.tool, 'fr'));
  const picks: (typeof codes)[number][] = [];
  const families = new Set<string>();
  for (const code of ranked) if (picks.length < count && !families.has(code.family ?? '')) { picks.push(code); families.add(code.family ?? ''); }
  for (const code of ranked) if (picks.length < count && !picks.includes(code)) picks.push(code);
  return picks.map(code => ({ toolSlug: code.toolSlug, tool: code.tool, discount: shortDiscount(code.discount) }));
}
