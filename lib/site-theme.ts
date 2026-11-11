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

/**
 * Couleur de la barre d'état du téléphone et de la barre du navigateur pour chaque thème :
 * le fond tout en haut de la page (voir --bg dans site.css), pas la couleur de la marque.
 */
export const SITE_THEME_COLORS: Record<SiteTheme, string> = { light: '#FFFFFF', dark: '#070B1A' };

/** Accorde la balise theme-color au thème choisi (le thème suit un bouton, pas le réglage du téléphone). */
export function applySiteThemeColor(doc: Pick<Document, 'querySelectorAll'>, theme: SiteTheme): void {
  doc.querySelectorAll('meta[name="theme-color"]').forEach(meta => meta.setAttribute('content', SITE_THEME_COLORS[theme]));
}

export function nextSiteTheme(theme: SiteTheme): SiteTheme {
  return theme === 'dark' ? 'light' : 'dark';
}

/**
 * Petit script lancé avant le premier affichage : pose le thème enregistré sur <html>,
 * sans flash du thème clair quand le visiteur a choisi le sombre.
 */
export const SITE_THEME_SCRIPT = `try{if(localStorage.getItem(${JSON.stringify(SITE_THEME_KEY)})==='dark')document.documentElement.setAttribute(${JSON.stringify(SITE_THEME_ATTR)},'dark')}catch(e){}`;
