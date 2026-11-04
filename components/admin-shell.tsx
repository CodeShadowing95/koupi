'use client';
// Coque du back-office : menu latéral groupé, barre du haut avec le fil d'Ariane et le bouton clair / sombre.
// La page de connexion garde un affichage simple, sans menu.
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { usePendingSubmissions } from '@/app/admin/pending-count';
import { ThemeToggle } from '@/components/admin-theme';
import { CommandPalette } from '@/components/admin-command';
import { AdminNotifications } from '@/components/admin-notifications';
import { AdminCouponTear } from '@/components/admin-coupon-tear';
import { AdminIcon } from '@/components/admin-icons';

/** count : nombre à traiter (pastille). children : sous-menus, dépliés par la flèche à droite de l'item. */
type Item = { href: string; label: string; icon: React.ReactNode; count?: number; countLabel?: string; children?: Item[] };

const icons = {
  home: <AdminIcon name="home" />,
  stats: <AdminIcon name="stats" />,
  gauge: <AdminIcon name="gauge" />,
  inbox: <AdminIcon name="inbox" />,
  chat: <AdminIcon name="chat" />,
  ticket: <AdminIcon name="ticket" />,
  shield: <AdminIcon name="shield" />,
  mic: <AdminIcon name="mic" />,
  tool: <AdminIcon name="tool" />,
  users: <AdminIcon name="users" />,
  folder: <AdminIcon name="folder" />,
  book: <AdminIcon name="book" />,
  settings: <AdminIcon name="settings" />,
  external: <AdminIcon name="external" />,
  menu: <AdminIcon name="menu" />,
  close: <AdminIcon name="close" />,
  logout: <AdminIcon name="logout" />,
};

// Menu regroupé : chaque grand espace (Codes, Créateurs, Outils, Statistiques) garde ses pages liées en sous-menus,
// pour que tout tienne sans défiler. « Voir le site » et « Se déconnecter » restent fixés en bas.
function navGroups(counts: { toTest?: number; pending?: number; newFeedback?: number } = {}): { label: string; items: Item[] }[] {
  return [
  { label: 'Pilotage', items: [
    { href: '/admin', label: 'Accueil', icon: icons.home },
    { href: '/admin/stats', label: 'Statistiques', icon: icons.stats, children: [
      { href: '/admin/consommation', label: 'Consommation', icon: icons.gauge },
    ] },
    { href: '/admin/retours', label: 'Retours', icon: icons.chat, count: counts.newFeedback, countLabel: 'nouveaux avis' },
  ] },
  { label: 'Catalogue', items: [
    { href: '/admin/codes', label: 'Codes', icon: icons.ticket, count: counts.toTest, countLabel: 'à tester', children: [
      { href: '/admin/propositions', label: 'Propositions', icon: icons.inbox, count: counts.pending, countLabel: 'à valider' },
      { href: '/admin/verifications', label: 'Vérifications', icon: icons.shield },
      { href: '/admin/podcasts', label: 'Podcasts suivis', icon: icons.mic },
    ] },
    { href: '/admin/createurs', label: 'Créateurs', icon: icons.users, children: [
      { href: '/admin/createurs/demandes', label: 'Demandes', icon: icons.inbox },
    ] },
    { href: '/admin/outils', label: 'Outils', icon: icons.tool, children: [
      { href: '/admin/categories', label: 'Catégories', icon: icons.folder },
    ] },
  ] },
  { label: 'Aide et réglages', items: [
    { href: '/admin/guide', label: 'Guide de l’admin', icon: icons.book },
    { href: '/admin/administration', label: 'Administration', icon: icons.settings },
  ] },
  ];
}

const allItems = (items: Item[]): Item[] => items.flatMap(item => [item, ...allItems(item.children ?? [])]);

const titles: Record<string, string> = Object.fromEntries(navGroups().flatMap(group => allItems(group.items)).map(item => [item.href, item.label]));
/** Page parente d'un sous-menu, pour le fil d'Ariane (Accueil / Codes / Propositions). */
const parents: Record<string, string> = Object.fromEntries(navGroups().flatMap(group => group.items.flatMap(item => (item.children ?? []).map(child => [child.href, item.href]))));

function isActive(pathname: string, href: string) {
  return href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
}

function Logo() {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="adm-logo-light" src="/merkod-logo.png" alt="Merkod" width={1427} height={391} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="adm-logo-dark" src="/merkod-logo-dark.png" alt="" width={1323} height={287} />
    </>
  );
}

function CountBadge({ item }: { item: Item }) {
  if (!item.count) return null;
  return <span className="adm-count-badge" aria-label={`${item.count} ${item.countLabel ?? ''}`.trim()}>{item.count > 99 ? '99+' : item.count}</span>;
}

/** Un item du menu. Avec des sous-menus : le nom ouvre la page, la flèche déplie la liste en dessous.
 *  La liste est ouverte d'office quand on est sur l'une de ses pages ; repliée, un point signale ce qui attend dedans. */
function SideItem({ item, current, pathname }: { item: Item; current?: string; pathname: string }) {
  const children = item.children ?? [];
  const inside = children.some(child => child.href === current);
  const [open, setOpen] = useState(inside);
  useEffect(() => { if (inside) setOpen(true); }, [inside, pathname]);
  const link = (entry: Item, sub = false) => (
    <Link href={entry.href} className={`adm-side-link${sub ? ' is-sub' : ''}`} aria-current={entry.href === current ? 'page' : undefined}>
      {entry.icon}<span className="adm-side-text">{entry.label}</span><CountBadge item={entry} />
    </Link>
  );
  if (!children.length) return link(item);
  const waiting = children.reduce((total, child) => total + (child.count ?? 0), 0);
  const id = `adm-sub-${item.href.split('/').pop()}`;
  return (
    <div className={`adm-side-parent${open ? ' is-open' : ''}`}>
      <div className="adm-side-row">
        {link(item)}
        {!open && waiting > 0 && <span className="adm-side-dot" title={`${waiting} à traiter dans les sous-menus`} aria-hidden="true" />}
        <button type="button" className="adm-side-toggle" aria-expanded={open} aria-controls={id}
          aria-label={`${open ? 'Replier' : 'Déplier'} les sous-menus de ${item.label}${!open && waiting ? ` (${waiting} à traiter)` : ''}`}
          onClick={() => setOpen(value => !value)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
        </button>
      </div>
      <div className="adm-side-sub" id={id} hidden={!open}>
        {children.map(child => <div key={child.href}>{link(child, true)}</div>)}
      </div>
    </div>
  );
}

/** toTest : codes à tester (badge de Codes) ; newFeedback : avis pas encore lus (badge de Retours). Lus en base par le layout. */
export function AdminShell({ children, toTest = 0, newFeedback = 0 }: { children: React.ReactNode; toTest?: number; newFeedback?: number }) {
  const pathname = usePathname();
  const pending = usePendingSubmissions() ?? 0;
  const groups = navGroups({ toTest, pending, newFeedback });
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
          <Link className="adm-brand" href="/admin" aria-label="Merkod, accueil admin"><Logo /><span className="admin-badge">Admin</span></Link>
          <button type="button" ref={closeButton} className="adm-icon-btn adm-side-close" aria-label="Fermer le menu" onClick={() => setMenuOpen(false)}>{icons.close}</button>
        </div>
        <div className="adm-side-scroll">
          {groups.map(group => (
            <div className="adm-side-group" key={group.label}>
              <span className="adm-side-label">{group.label}</span>
              {group.items.map(item => <SideItem key={item.href} item={item} current={current} pathname={pathname} />)}
            </div>
          ))}
        </div>
        <div className="adm-side-group adm-side-foot">
          <Link className="adm-side-link" href="/" target="_blank" rel="noopener noreferrer">{icons.external}<span className="adm-side-text">Voir le site</span></Link>
          <form method="post" action="/api/admin/logout"><button className="adm-side-link" type="submit">{icons.logout}<span className="adm-side-text">Se déconnecter</span></button></form>
        </div>
      </nav>
      <div className="adm-main">
        <header className="adm-top">
          <Link className="adm-brand adm-top-brand" href="/admin" aria-label="Merkod, accueil admin"><Logo /><span className="admin-badge">Admin</span></Link>
          <nav className="adm-crumbs" aria-label="Fil d’Ariane">
            {current && current !== '/admin' ? <><Link href="/admin">Accueil</Link> / {parents[current] && <><Link href={parents[current]}>{titles[parents[current]]}</Link> / </>}<b>{titles[current]}</b></> : <b>Accueil</b>}
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
