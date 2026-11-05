// Quelle icône du menu montrer pour un lien du back-office (recherche ⌘K) : la même que l'entrée du menu latéral.
export type PageIcon = 'home' | 'stats' | 'inbox' | 'ticket' | 'shield' | 'mic' | 'radar' | 'tool' | 'users' | 'folder' | 'book' | 'download' | 'settings';

const sections: [prefix: string, icon: PageIcon][] = [
  ['/api/admin/export', 'download'],
  ['/admin/stats', 'stats'],
  ['/admin/propositions', 'inbox'],
  ['/admin/codes', 'ticket'],
  ['/admin/verifications', 'shield'],
  ['/admin/sources', 'radar'],
  ['/admin/podcasts', 'mic'],
  ['/admin/outils', 'tool'],
  ['/admin/createurs', 'users'],
  ['/admin/categories', 'folder'],
  ['/admin/guide', 'book'],
  ['/admin/administration', 'settings'],
];

export function iconForHref(href: string): PageIcon {
  const path = href.split('?')[0];
  const match = sections.find(([prefix]) => path === prefix || path.startsWith(`${prefix}/`));
  return match ? match[1] : 'home';
}
