// Pages publiques que l'admin peut couper (espace Administration, ADR-0022). Sans base ni réseau : importable partout,
// y compris par le middleware et les composants client.
// Une page coupée répond 404 (elle et ses sous-pages), disparaît des menus et ses liens deviennent du texte simple.

export const PAGE_KEYS = [
  'home', 'codes', 'categories', 'tools', 'creators', 'search', 'submit',
  'feedback', 'transparency', 'for-creators', 'creator-space', 'legal', 'privacy',
] as const;
export type PageKey = (typeof PAGE_KEYS)[number];

export type SitePage = {
  key: PageKey;
  label: string;
  /** Adresses couvertes : la page et tout ce qui est en dessous. */
  paths: string[];
  /** Routes d'API qui ne servent qu'à cette page : coupées avec elle. */
  apis?: string[];
  /** Toujours en ligne (obligatoire ou point d'entrée) : listée, sans interrupteur. */
  locked?: string;
  /** Ce qui disparaît en plus de la page, pour l'admin. */
  effect: string;
};

export const SITE_PAGES: SitePage[] = [
  { key: 'home', label: 'Accueil', paths: ['/'], locked: 'Point d’entrée du site', effect: '—' },
  { key: 'codes', label: 'Codes', paths: ['/codes', '/explore'], effect: 'Lien « Codes promo » du menu et « Tous les codes » du pied de page ; la page Explorer aussi' },
  { key: 'categories', label: 'Pages de catégorie', paths: ['/categories'], effect: 'Catégorie cliquable sur les fiches outils (les pastilles de la page Codes restent)' },
  { key: 'tools', label: 'Fiches outils', paths: ['/tools'], effect: 'Les coupons et la recherche ne mènent plus à une fiche' },
  { key: 'creators', label: 'Créateurs', paths: ['/creators'], effect: 'Lien du menu, noms des créateurs cliquables sur les coupons' },
  { key: 'search', label: 'Recherche', paths: ['/search'], effect: 'Page de résultats ; sans fiches outils non plus, la recherche disparaît' },
  { key: 'submit', label: 'Proposer un code', paths: ['/submit'], apis: ['/api/submissions'], effect: 'Boutons « Proposer un code » ; les envois sont refusés' },
  { key: 'feedback', label: 'Ton avis', paths: ['/feedback'], apis: ['/api/feedback'], effect: 'Lien du menu et du pied de page ; les envois sont refusés' },
  { key: 'transparency', label: 'Transparence', paths: ['/transparency'], effect: 'Lien du menu, du pied de page et des badges de niveau' },
  { key: 'for-creators', label: 'Pour les créateurs', paths: ['/for-creators'], effect: 'Lien du pied de page et « C’est ta page ? »' },
  { key: 'creator-space', label: 'Espace créateur', paths: ['/creator'], apis: ['/api/creator-auth', '/api/creator-requests'], effect: 'Connexion des créateurs et demandes sur les pages créateurs' },
  { key: 'legal', label: 'Mentions légales', paths: ['/legal'], locked: 'Obligatoire par la loi', effect: '—' },
  { key: 'privacy', label: 'Confidentialité', paths: ['/privacy'], locked: 'Obligatoire (RGPD)', effect: '—' },
];

export const MAINTENANCE_KEY = 'maintenance';
export const pageSettingKey = (key: PageKey) => `page:${key}`;

export function isPageKey(value: unknown): value is PageKey {
  return typeof value === 'string' && (PAGE_KEYS as readonly string[]).includes(value);
}

const under = (pathname: string, base: string) => (base === '/' ? pathname === '/' : pathname === base || pathname.startsWith(`${base}/`));

/** La page publique qui couvre cette adresse (ou cette route d'API), null sinon. */
export function pageForPath(pathname: string): SitePage | null {
  return SITE_PAGES.find(page => [...page.paths, ...(page.apis ?? [])].some(base => under(pathname, base))) ?? null;
}

/** Une adresse est coupée si sa page l'est. Les pages verrouillées ne le sont jamais. */
export function isPathOff(pathname: string, off: readonly PageKey[]): boolean {
  const page = pageForPath(pathname.split(/[?#]/)[0]);
  return Boolean(page && !page.locked && off.includes(page.key));
}

/** Adresses que le mode maintenance laisse passer : l'admin, ses API, les tâches planifiées et les fichiers. */
export function bypassesMaintenance(pathname: string): boolean {
  return pathname === '/maintenance' || under(pathname, '/admin') || under(pathname, '/api/admin') || under(pathname, '/api/cron')
    || pathname.startsWith('/_next') || /\.[a-z0-9]{2,5}$/i.test(pathname);
}

export type SiteState = { off: PageKey[]; maintenance: boolean };
export const DEFAULT_SITE_STATE: SiteState = { off: [], maintenance: false };

/** Que faire d'une requête : la laisser passer, répondre 404, ou montrer la page de maintenance. */
export function siteDecision(pathname: string, state: SiteState, isAdmin: boolean): 'pass' | 'not-found' | 'maintenance' {
  if (state.maintenance && !isAdmin && !bypassesMaintenance(pathname)) return 'maintenance';
  if (pathname === '/maintenance' && !state.maintenance) return 'not-found';
  return isPathOff(pathname, state.off) ? 'not-found' : 'pass';
}
