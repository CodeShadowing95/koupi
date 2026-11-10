// Référencement : adresse publique du site, robots.txt et sitemap.xml (app/robots.ts, app/sitemap.ts).
import type { MetadataRoute } from 'next';
import { isPublic, type Catalog } from './data';
import { routes } from './routes';
import { isPathOff, type PageKey } from './site-pages';

type Env = Record<string, string | undefined>;

/** Adresse publique du site, sans barre finale. NEXT_PUBLIC_SITE_URL permet d'en changer sans toucher au code. */
export function siteUrl(env: Env = process.env): string {
  const raw = env.NEXT_PUBLIC_SITE_URL?.trim().replace(/^['"]|['"]$/g, '').replace(/\/+$/, '');
  if (!raw) return 'https://merkod.com';
  return /^https?:\/\//.test(raw) ? raw : `https://${raw}`;
}

/** Seule la production est ouverte à Google. La pré-production (develop) et les aperçus Vercel restent fermés. */
export function isIndexable(env: Env = process.env): boolean {
  return env.VERCEL_ENV ? env.VERCEL_ENV === 'production' : env.NODE_ENV === 'production';
}

/** Pages sans intérêt pour un moteur de recherche : admin, API, espace créateur, résultats de recherche. */
// « /creator » seul bloquerait aussi /creators (les robots comparent le début de l'adresse) : $ et / l'évitent.
export const PRIVATE_PATHS = ['/admin', '/api/', '/creator$', '/creator/', '/search', '/maintenance'];

export function robotsRules(indexable: boolean, base: string): MetadataRoute.Robots {
  if (!indexable) return { rules: { userAgent: '*', disallow: '/' } };
  return { rules: { userAgent: '*', allow: '/', disallow: PRIVATE_PATHS }, sitemap: `${base}/sitemap.xml`, host: base };
}

const STATIC_PATHS = [
  // /categories, /codes et /creators redirigent vers la page principale : seule la page d'arrivée est listée.
  routes.home, routes.about, routes.blackFriday, routes.christmas, routes.sales, routes.submit(), routes.feedback,
  routes.transparency, routes.forCreators(), routes.legal, routes.privacy,
];

const latest = (dates: string[]) => dates.reduce<string | undefined>((max, date) => (!max || date > max ? date : max), undefined);

/** Toutes les pages publiques à faire connaître, sans les pages coupées par l'admin. */
export function sitemapEntries(catalog: Pick<Catalog, 'categories' | 'tools' | 'codes'>, off: readonly PageKey[], base: string): MetadataRoute.Sitemap {
  const live = catalog.codes.filter(isPublic);
  const datesOf = (pick: (code: (typeof live)[number]) => string) => {
    const map = new Map<string, string[]>();
    for (const code of live) map.set(pick(code), [...(map.get(pick(code)) ?? []), code.lastTestedAt ?? code.createdAt]);
    return map;
  };
  const toolDates = datesOf(code => code.toolSlug);
  const creatorDates = datesOf(code => code.creatorSlug);
  const entries: { path: string; lastModified?: string; priority: number }[] = [
    ...STATIC_PATHS.map(path => ({ path, priority: path === routes.home ? 1 : 0.5 })),
    ...catalog.categories.filter(category => category.count > 0).map(category => ({ path: routes.category(category.slug), priority: 0.6 })),
    ...catalog.tools.map(tool => ({ path: routes.tool(tool.slug), lastModified: latest(toolDates.get(tool.slug) ?? []), priority: 0.8 })),
    ...[...creatorDates.keys()].filter(Boolean).sort().map(slug => ({ path: routes.creator(slug), lastModified: latest(creatorDates.get(slug) ?? []), priority: 0.7 })),
  ];
  return entries
    .filter(entry => !isPathOff(entry.path, off))
    .map(({ path, lastModified, priority }) => ({ url: `${base}${path === '/' ? '' : path}`, ...(lastModified ? { lastModified } : {}), priority }));
}

/**
 * Mois en cours à Paris, en toutes lettres (« novembre 2026 »), ajouté aux titres des pages : on cherche « code promo
 * Canva novembre 2026 », et un titre daté montre que la page est tenue à jour. Les pages sont rendues à chaque visite,
 * le mois change donc tout seul.
 */
export function seoMonth(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric', timeZone: 'Europe/Paris' }).format(now);
}
