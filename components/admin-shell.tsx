'use client';
// Coque du back-office : menu latéral groupé, barre du haut avec le fil d'Ariane et le bouton clair / sombre.
// La page de connexion garde un affichage simple, sans menu.
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { PendingBadge } from '@/app/admin/pending-count';
import { ThemeToggle } from '@/components/admin-theme';
import { CommandPalette } from '@/components/admin-command';
import { AdminNotifications } from '@/components/admin-notifications';
import { AdminCouponTear } from '@/components/admin-coupon-tear';
import { AdminIcon } from '@/components/admin-icons';

type Item = { href: string; label: string; icon: React.ReactNode; badge?: React.ReactNode };

const icons = {
  home: <AdminIcon name="home" />,
  stats: <AdminIcon name="stats" />,
  inbox: <AdminIcon name="inbox" />,
  ticket: <AdminIcon name="ticket" />,
  shield: <AdminIcon name="shield" />,
  mic: <AdminIcon name="mic" />,
  tool: <AdminIcon name="tool" />,
  users: <AdminIcon name="users" />,
  folder: <AdminIcon name="folder" />,
  book: <AdminIcon name="book" />,
  external: <AdminIcon name="external" />,
  menu: <AdminIcon name="menu" />,
  close: <AdminIcon name="close" />,
  logout: <AdminIcon name="logout" />,
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
    { href: '/admin/verifications', label: 'Vérifications', icon: icons.shield },
    { href: '/admin/podcasts', label: 'Podcasts suivis', icon: icons.mic },
    { href: '/admin/createurs/demandes', label: 'Demandes créateurs', icon: icons.users },
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
  // Mobile : le menu latéral devient un tiroir ouvert par le bouton ☰ de la barre du haut.
  const [menuOpen, setMenuOpen] = useState(false);
  const burger = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => { setMenuOpen(false); }, [pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenuOpen(false); };
    const desktop = window.matchMedia('(min-width: 901px)');
    const onResize = () => { if (desktop.matches) setMenuOpen(false); };
    document.addEventListener('keydown', onKey);
    desktop.addEventListener('change', onResize);
    document.documentElement.classList.add('adm-menu-lock');
    closeButton.current?.focus();
    return () => {
      if (!desktop.matches) burger.current?.focus();
      document.removeEventListener('keydown', onKey);
      desktop.removeEventListener('change', onResize);
      document.documentElement.classList.remove('adm-menu-lock');
    };
  }, [menuOpen]);
  if (pathname.startsWith('/admin/login')) {
    // Portail de connexion : plein écran, sans barre du haut ; seul le bouton clair / sombre reste, en haut à droite.
    return (
      <>
        <div className="lp-theme"><ThemeToggle /></div>
        {children}
        <AdminCouponTear key="coupon-tear" />
      </>
    );
  }
  const current = Object.keys(titles).filter(href => isActive(pathname, href)).sort((a, b) => b.length - a.length)[0];
  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <>
    <div className="adm-shell" data-menu={menuOpen ? 'open' : undefined}>
      <div className="adm-side-backdrop" aria-hidden="true" onClick={() => setMenuOpen(false)} />
      <nav className="adm-side" id="adm-side" aria-label="Navigation admin">
        <div className="adm-side-head">
          <Link className="adm-brand" href="/admin" aria-label="Koupi, accueil admin"><Logo /><span className="admin-badge">Admin</span></Link>
          <button type="button" ref={closeButton} className="adm-icon-btn adm-side-close" aria-label="Fermer le menu" onClick={() => setMenuOpen(false)}>{icons.close}</button>
        </div>
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
          <Link className="adm-brand adm-top-brand" href="/admin" aria-label="Koupi, accueil admin"><Logo /><span className="admin-badge">Admin</span></Link>
          <nav className="adm-crumbs" aria-label="Fil d’Ariane">
            {current && current !== '/admin' ? <><Link href="/admin">Accueil</Link> / <b>{titles[current]}</b></> : <b>Accueil</b>}
          </nav>
          <div className="adm-top-right">
            <CommandPalette />
            <span className="adm-today" suppressHydrationWarning>{today.charAt(0).toUpperCase() + today.slice(1)}</span>
            <AdminNotifications />
            <ThemeToggle />
            <button type="button" ref={burger} className="adm-icon-btn adm-burger" aria-label="Ouvrir le menu" aria-expanded={menuOpen} aria-controls="adm-side" onClick={() => setMenuOpen(true)}>{icons.menu}</button>
          </div>
        </header>
        {children}
      </div>
    </div>
    <AdminCouponTear key="coupon-tear" />
    </>
  );
}
