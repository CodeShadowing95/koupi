// Kit de saison du créateur (Black Friday, Noël) : une page à partager avec ses codes,
// une image pour ses stories et un texte prêt pour ses descriptions. Le Studio le propose pendant la saison.
import { isPublic, type Code } from './data';
import { expiryOf } from './code-expiry';
import { christmasYear } from './christmas';
import type { Season } from './season-banner';

export const KIT_KINDS = ['black-friday', 'noel'] as const;
export type KitKind = (typeof KIT_KINDS)[number];

export const KIT_LABEL: Record<KitKind, string> = { 'black-friday': 'Black Friday', noel: 'Noël' };

export function kitKindOf(value: string): KitKind | null {
  return (KIT_KINDS as readonly string[]).includes(value) ? (value as KitKind) : null;
}

/** Le kit de la saison en cours, ou rien hors saison. */
export function kitKindForSeason(season: Pick<Season, 'kind'> | null): KitKind | null {
  if (!season) return null;
  return season.kind === 'christmas' ? 'noel' : 'black-friday';
}

/** Année affichée : Noël garde l'année du 25 décembre jusqu'à l'Épiphanie. */
export function kitYear(kind: KitKind, now: Date): number {
  return kind === 'noel' ? christmasYear(now) : now.getUTCFullYear();
}

export const kitPath = (slug: string, kind: KitKind) => `/@${slug}/${kind}`;
export const kitImagePath = (slug: string, kind: KitKind) => `${kitPath(slug, kind)}/story`;

type KitCode = Pick<Code, 'toolSlug' | 'status' | 'expiresOn' | 'discount' | 'success'>;

/** Une réduction chiffrée et courte (« -20 % », « 2 mois offerts ») se lit d'un coup d'œil. */
const striking = (discount: string) => (/\d/.test(discount) && discount.length <= 24 ? 1 : 0);

/**
 * Les codes du kit : publiés, pas expirés, le plus fiable de chaque outil.
 * Les réductions chiffrées d'abord, puis les plus fiables.
 */
export function kitCodes<T extends KitCode>(codes: T[], now: Date): T[] {
  const best = new Map<string, T>();
  for (const code of codes) {
    if (!isPublic(code) || expiryOf(code.expiresOn, now).state === 'expired') continue;
    const current = best.get(code.toolSlug);
    if (!current || current.success < code.success) best.set(code.toolSlug, code);
  }
  return [...best.values()].sort((a, b) => striking(b.discount) - striking(a.discount) || b.success - a.success);
}

/** Les titres du kit, repris par la page, l'image et le texte de description. */
export function kitTitle(kind: KitKind, year: number): string {
  return kind === 'noel' ? `Mes codes promo de Noël ${year}` : `Mes codes promo Black Friday ${year}`;
}

/**
 * Le texte à coller dans une description (YouTube, Instagram, podcast) : le lien du kit puis un code par ligne.
 * Une offre sans code renvoie vers la page, où se trouve son lien.
 */
export function kitDescription({ kind, year, url, codes, max = 6 }: {
  kind: KitKind; year: number; url: string; codes: Pick<Code, 'tool' | 'code' | 'discount'>[]; max?: number;
}): string {
  const head = kind === 'noel'
    ? `🎄 Noël ${year} : tous mes codes promo à offrir (ou à s'offrir), au même endroit`
    : `🖤 Black Friday ${year} : tous mes codes promo, vérifiés, au même endroit`;
  const lines = codes.slice(0, max).map(code => code.code
    ? `• ${code.tool} : ${code.discount} avec le code ${code.code}`
    : `• ${code.tool} : ${code.discount} (lien sur la page)`);
  const extra = codes.length - max;
  const more = extra > 0 ? [`… et ${extra} ${extra > 1 ? 'autres' : 'autre'} sur la page`] : [];
  return [head, `👉 ${url}`, '', ...lines, ...more].join('\n').trimEnd();
}
