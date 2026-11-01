'use client';
// Coque du back-office : menu latéral groupé, barre du haut avec le fil d'Ariane et le bouton clair / sombre.
// La page de connexion garde un affichage simple, sans menu.
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PendingBadge } from '@/app/admin/pending-count';
import { ThemeToggle } from '@/components/admin-theme';
import { CommandPalette } from '@/components/admin-command';

type Item = { href: string; label: string; icon: React.ReactNode; badge?: React.ReactNode };

const icon = (path: React.ReactNode) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{path}</svg>;
const icons = {
  home: icon(<><path d="M3 10.5 12 3l9 7.5V21H3z" /><path d="M9 21v-6h6v6" /></>),
  stats: icon(<><path d="M4 20V10" /><path d="M10 20V4" /><path d="M16 20v-7" /><path d="M22 20H2" /></>),
  inbox: icon(<><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.5 5h13L22 12v7H2v-7z" /></>),
  ticket: icon(<path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4z" />),
  tool: icon(<><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.5-.5-.5-2.5z" /></>),
  users: icon(<><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7" /><path d="M18.5 14a6.5 6.5 0 0 1 3 6" /></>),
  folder: icon(<path d="M3 6.5A1.5 1.5 0 0 1 4.5 5H10l2 2.5h7.5A1.5 1.5 0 0 1 21 9v9.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z" />),
  book: icon(<><path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H20v16H5.5A1.5 1.5 0 0 0 4 20.5z" /><path d="M4 20.5A1.5 1.5 0 0 0 5.5 22H20" /></>),
  external: icon(<><path d="M14 4h6v6" /><path d="M20 4 10 14" /><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></>),
  logout: icon(<><path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4" /><path d="M10 16l-4-4 4-4" /><path d="M6 12h10" /></>),
};

function navGroups(toTest: number): { label: string; items: Item[] }[] {
  return [
  { label: 'Pilotage', items: [
    { href: '/admin', label: 'Accueil', icon: icons.home },
    { href: '/admin/stats', label: 'Statistiques', icon: icons.stats },
  ] },
  { label: 'Modération', items: [
    { href: '/admin/propositions', label: 'Propositions', icon: icons.inbox, badge: <PendingBadge /> },
    { href: '/admin/codes', label: 'Codes', icon: icons.ticket, badge: toTest ? <span className="adm-count-badge" aria-label={`${toTest} à tester`}>{toTest}</span> : null },
  ] },
  { label: 'Catalogue', items: [
    { href: '/admin/outils', label: 'Outils', icon: icons.tool },
    { href: '/admin/createurs', label: 'Créateurs', icon: icons.users },
    { href: '/admin/categories', label: 'Catégories', icon: icons.folder },
  ] },
  { label: 'Apprendre', items: [
    { href: '/admin/guide', label: 'Guide de l’admin', icon: icons.book },
  ] },
  ];
}

const titles: Record<string, string> = Object.fromEntries(navGroups(0).flatMap(group => group.items.map(item => [item.href, item.label])));

function isActive(pathname: string, href: string) {
  return href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
}

function Logo() {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="adm-logo-light" src="/koupi-logo.png" alt="Koupi" width={1100} height={480} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="adm-logo-dark" src="/koupi-logo-dark.png" alt="" width={1100} height={480} />
    </>
  );
}

/** toTest : nombre de codes à tester, lu en base par le layout (badge du menu Codes). */
export function AdminShell({ children, toTest = 0 }: { children: React.ReactNode; toTest?: number }) {
  const pathname = usePathname();
  const groups = navGroups(toTest);
  if (pathname.startsWith('/admin/login')) {
    // Portail de connexion : plein écran, sans barre du haut ; seul le bouton clair / sombre reste, en haut à droite.
    return (
      <>
        <div className="lp-theme"><ThemeToggle /></div>
        {children}
      </>
    );
  }
  const current = Object.keys(titles).filter(href => isActive(pathname, href)).sort((a, b) => b.length - a.length)[0];
  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <div className="adm-shell">
      <nav className="adm-side" aria-label="Navigation admin">
        <Link className="adm-brand" href="/admin" aria-label="Koupi, accueil admin"><Logo /><span className="admin-badge">Admin</span></Link>
        {groups.map(group => (
          <div className="adm-side-group" key={group.label}>
            <span className="adm-side-label">{group.label}</span>
            {group.items.map(item => (
              <Link key={item.href} href={item.href} className="adm-side-link" aria-current={item.href === current ? 'page' : undefined}>
                {item.icon}<span className="adm-side-text">{item.label}</span>{item.badge}
              </Link>
            ))}
          </div>
        ))}
        <div className="adm-side-group adm-side-foot">
          <Link className="adm-side-link" href="/" target="_blank" rel="noopener noreferrer">{icons.external}<span className="adm-side-text">Voir le site</span></Link>
          <form method="post" action="/api/admin/logout"><button className="adm-side-link" type="submit">{icons.logout}<span className="adm-side-text">Se déconnecter</span></button></form>
        </div>
      </nav>
      <div className="adm-main">
        <header className="adm-top">
          <nav className="adm-crumbs" aria-label="Fil d’Ariane">
            {current && current !== '/admin' ? <><Link href="/admin">Accueil</Link> / <b>{titles[current]}</b></> : <b>Accueil</b>}
          </nav>
          <div className="adm-top-right">
            <CommandPalette />
            <span className="adm-today" suppressHydrationWarning>{today.charAt(0).toUpperCase() + today.slice(1)}</span>
            <ThemeToggle />
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
