// Thème du site public (pas du back-office, qui a le sien). Clair par défaut, sombre au choix du visiteur.
// Le choix reste dans ce navigateur (localStorage) et n'est jamais envoyé au serveur.
export type SiteTheme = 'light' | 'dark';

export const SITE_THEME_KEY = 'merkod-theme';
/** Attribut posé sur <html> : les feuilles du site lisent :root[data-site-theme="dark"]. */
export const SITE_THEME_ATTR = 'data-site-theme';

type Store = Pick<Storage, 'getItem' | 'setItem'>;

export function parseSiteTheme(value: unknown): SiteTheme {
  return value === 'dark' ? 'dark' : 'light';
}

export function readSiteTheme(store: Store | undefined): SiteTheme {
  try { return parseSiteTheme(store?.getItem(SITE_THEME_KEY)); } catch { return 'light'; }
}

export function saveSiteTheme(store: Store | undefined, theme: SiteTheme): void {
  try { store?.setItem(SITE_THEME_KEY, theme); } catch { /* stockage indisponible : le choix vaut pour la page */ }
}

export function nextSiteTheme(theme: SiteTheme): SiteTheme {
  return theme === 'dark' ? 'light' : 'dark';
}

/**
 * Petit script lancé avant le premier affichage : pose le thème enregistré sur <html>,
 * sans flash du thème clair quand le visiteur a choisi le sombre.
 */
export const SITE_THEME_SCRIPT = `try{if(localStorage.getItem(${JSON.stringify(SITE_THEME_KEY)})==='dark')document.documentElement.setAttribute(${JSON.stringify(SITE_THEME_ATTR)},'dark')}catch(e){}`;
