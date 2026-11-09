'use client';
// Coque commune des pages du comptoir (Explorer, Codes, Créateurs, page d'un créateur) : colonne de rayons sur toute la hauteur
// (réduite en icônes d'un clic, tiroir sous 980 px) et barre du haut avec la recherche. Même structure partout.
// Sur l'Explorer, les rayons filtrent sur place (onGo) ; sur les autres pages, ce sont des liens vers l'Explorer.
import { SiteLogo } from '@/components/site/site-logo';
import { ThemeToggle } from '@/components/site/theme-toggle';
import Link, { SiteLinkItem, useIsOff } from '@/components/site/site-pages';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Code, Family, Tool } from '@/lib/data';
import { routes } from '@/lib/routes';
import { isSoundEnabled, setSoundEnabled } from '@/lib/coupon-sound';
import { usesLogoDev } from '@/lib/tool-logos';
import { DEFAULT_EXPLORE, EXPLORE_RAIL_KEY, exploreCodes, exploreToParams, familyEntries, SHELVES, shortName, topCreators, type ExploreState, type Shelf } from '@/lib/explore';
import { CreatorAvatar } from '@/components/site/creator-avatar';
import { CreatorMark } from '@/components/site/creator-mark';
import { CreateList, CreateMenu, CreatorButton } from '@/components/site/create-menu';
import { FamilyIcon, ShelfIcon } from '@/components/site/explore-icons';
import { PORTFOLIO_URL, PUBLISHER_NAME } from '@/lib/site-contact';
import { currentSeason } from '@/lib/season-banner';

/** Ce qui est en surbrillance dans la colonne. */
export type ShellActive =
  | { kind: 'shelf'; shelf: Shelf }
  | { kind: 'family'; slug: string }
  | { kind: 'creator'; slug: string }
  | null;

type Search = { value: string; onChange: (value: string) => void; onSubmit: () => void };

type Props = {
  codes: Code[];
  tools: Tool[];
  families: Family[];
  now: number;
  active: ShellActive;
  /** Explorer : les rayons filtrent sur place. Absent : les rayons mènent à l'Explorer. */
  onGo?: (next: Partial<ExploreState>) => void;
  /** Explorer : la recherche filtre en direct. Absent : la recherche ouvre l'Explorer sur ces mots. */
  search?: Search;
  /** Texte du lien d'évitement (« Aller aux codes »). */
  skipLabel?: string;
  logoDev?: boolean;
  children: ReactNode;
};

const exploreHref = (next: Partial<ExploreState>) => {
  const params = exploreToParams({ ...DEFAULT_EXPLORE, ...next }).toString();
  return params ? `${routes.home}?${params}` : routes.home;
};

/** Un rayon : bouton qui filtre sur l'Explorer, lien ailleurs. Défini hors de la coque pour garder le focus au clic. */
function Item({ next, current, title, children, href, onGo, onPick }: {
  next: Partial<ExploreState>; current: boolean; title: string; children: ReactNode; href?: string;
  onGo?: (next: Partial<ExploreState>) => void; onPick: () => void;
}) {
  if (onGo && !href) {
    return <button type="button" className="k-ex-item" aria-current={current ? 'page' : undefined} onClick={() => { onPick(); onGo(next); }} title={title}>{children}</button>;
  }
  return <Link className="k-ex-item" aria-current={current ? 'page' : undefined} href={href ?? exploreHref(next)} title={title} onClick={onPick}>{children}</Link>;
}

export function ExploreShell({ codes, tools, families, now, active, onGo, search, skipLabel = 'Aller au contenu', logoDev = false, children }: Props) {
  const router = useRouter();
  const [mini, setMini] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [sound, setSound] = useState(true);
  const [localQuery, setLocalQuery] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const isOff = useIsOff();

  const season = useMemo(() => currentSeason(new Date(now)), [now]);
  const shelfCounts = useMemo(() => Object.fromEntries(SHELVES.map(({ value }) => [value, exploreCodes(codes, tools, { ...DEFAULT_EXPLORE, shelf: value }, now).length])) as Record<Shelf, number>, [codes, tools, now]);
  const familyList = useMemo(() => familyEntries(codes, tools, families), [codes, tools, families]);
  const creators = useMemo(() => topCreators(codes, 7), [codes]);

  const query = search ? search.value : localQuery;
  const setQuery = search ? search.onChange : setLocalQuery;

  // Préférences du navigateur : colonne réduite, son des coupons.
  useEffect(() => {
    try { setMini(window.localStorage.getItem(EXPLORE_RAIL_KEY) === 'mini'); } catch { /* stockage indisponible */ }
    setSound(isSoundEnabled());
    const onSound = (event: Event) => setSound((event as CustomEvent<boolean>).detail);
    window.addEventListener('koupi-sound-change', onSound);
    return () => window.removeEventListener('koupi-sound-change', onSound);
  }, []);

  // « / » ou Ctrl/Cmd + K place le curseur dans la recherche, comme sur les grands sites de vidéo.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
      if ((event.key === '/' && !typing) || (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey))) {
        event.preventDefault();
        input.current?.focus();
      }
      if (event.key === 'Escape') setDrawer(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Le tiroir ouvert sur mobile bloque le défilement de la page derrière.
  useEffect(() => {
    document.documentElement.classList.toggle('k-menu-lock', drawer);
    return () => document.documentElement.classList.remove('k-menu-lock');
  }, [drawer]);

  const toggleRail = () => {
    if (window.matchMedia('(max-width: 980px)').matches) { setDrawer(open => !open); return; }
    setMini(current => {
      try { window.localStorage.setItem(EXPLORE_RAIL_KEY, current ? 'full' : 'mini'); } catch { /* stockage indisponible */ }
      return !current;
    });
  };
  const closeDrawer = () => setDrawer(false);
  const submit = () => {
    if (search) { search.onSubmit(); return; }
    const words = localQuery.trim();
    router.push(words ? exploreHref({ query: words }) : routes.home);
  };

  const Burger = ({ label }: { label: string }) => (
    <button type="button" className="k-ex-burger" onClick={toggleRail} aria-controls="k-ex-side" aria-expanded={drawer || !mini} aria-label={label}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
    </button>
  );
  const Logo = () => (
    <Link className="k-ex-logo" href={routes.home} aria-label="Merkod, accueil">
      <SiteLogo className="k-ex-logo-full" priority />
    </Link>
  );

  return (
    <div className={`kp k-ex${mini ? ' is-mini' : ''}${drawer ? ' is-drawer' : ''}`}>
      <a className="k-skip" href="#contenu">{skipLabel}</a>

      <aside className="k-ex-side" id="k-ex-side" aria-label="Rayons">
        <div className="k-ex-side-top">
          <Burger label={mini ? 'Ouvrir la colonne' : 'Réduire la colonne'} />
          <Logo />
        </div>

        {/* Sur téléphone, la barre du haut n'a de place que pour la recherche : le menu « Créer » passe dans le tiroir. */}
        <div className="k-ex-side-create"><CreateList onPick={() => setDrawer(false)} /><ThemeToggle row /></div>

        <nav className="k-ex-nav" aria-label="Rayons du comptoir">
          <ul className="k-ex-group">
            {SHELVES.map(({ value, label, short }) => (shelfCounts[value] > 0 || value === 'all') && (
              <li key={value}>
                <Item onGo={onGo} onPick={closeDrawer} next={{ shelf: value }} current={active?.kind === 'shelf' && active.shelf === value} title={label}>
                  <ShelfIcon shelf={value} />
                  <span className="k-ex-item-label">{label}</span>
                  <span className="k-ex-item-short" aria-hidden="true">{short}</span>
                  <span className="k-ex-item-count">{shelfCounts[value]}</span>
                </Item>
              </li>
            ))}
            {season && (
              <li>
                <Link className="k-ex-item k-ex-season" href={season.kind === 'christmas' ? routes.christmas : routes.blackFriday} title={season.kind === 'christmas' ? 'Codes de Noël' : 'Codes Black Friday'}>
                  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d={season.kind === 'christmas' ? 'M4 12h16v8H4zM3 8h18v4H3zM12 8v12M12 8c-2-4-6-4-6-1.5S10 8 12 8Zm0 0c2-4 6-4 6-1.5S14 8 12 8Z' : 'M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8ZM7.5 7.5h.01'} /></svg>
                  <span className="k-ex-item-label">{season.kind === 'christmas' ? 'Noël' : 'Black Friday'}</span>
                  <span className="k-ex-item-short" aria-hidden="true">{season.kind === 'christmas' ? 'Noël' : 'Black F.'}</span>
                  <span className="k-ex-item-count k-ex-season-days">{season.daysLeft > 0 ? `J-${season.daysLeft}` : 'Jour J'}</span>
                </Link>
              </li>
            )}
          </ul>

          {familyList.length > 0 && <>
            <h2 className="k-ex-group-title">Familles</h2>
            <ul className="k-ex-group">
              {familyList.map(family => (
                <li key={family.slug}>
                  <Item onGo={onGo} onPick={closeDrawer} next={{ family: family.slug }} current={active?.kind === 'family' && active.slug === family.slug} title={family.name}>
                    <FamilyIcon family={family.slug} />
                    <span className="k-ex-item-label">{family.name}</span>
                    <span className="k-ex-item-short" aria-hidden="true">{shortName(family.name)}</span>
                    <span className="k-ex-item-count">{family.count}</span>
                  </Item>
                </li>
              ))}
            </ul>
          </>}

          {creators.length > 0 && <>
            <h2 className="k-ex-group-title">Créateurs</h2>
            <ul className="k-ex-group is-creators">
              {creators.map(creator => (
                <li key={creator.slug}>
                  {/* Sur l'Explorer, un créateur filtre le fil ; ailleurs, il ouvre sa page. */}
                  <Item onGo={onGo} onPick={closeDrawer} next={{ creator: creator.slug }} href={onGo ? undefined : routes.creator(creator.slug)} current={active?.kind === 'creator' && active.slug === creator.slug} title={creator.name}>
                    <CreatorAvatar name={creator.name} size="xs" />
                    <span className="k-ex-item-label">{creator.name}<CreatorMark level={creator.level} compact /></span>
                    <span className="k-ex-item-count">{creator.count}</span>
                  </Item>
                </li>
              ))}
            </ul>
          </>}
        </nav>

        {/* L'ancienne page d'accueil : pourquoi faire confiance à Merkod, pour les curieux et les créateurs. */}
        {!isOff(routes.about) && (
          <Link className="k-ex-item k-ex-about" href={routes.about}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 7.5h.01" /></svg>
            <span className="k-ex-item-label">Présentation de Merkod</span>
            <span className="k-ex-item-short" aria-hidden="true">Merkod</span>
          </Link>
        )}

        <footer className="k-ex-side-foot">
          <ul>
            <SiteLinkItem href={routes.forCreators()}>Pour les créateurs</SiteLinkItem>
            <SiteLinkItem href={routes.feedback}>Ton avis</SiteLinkItem>
            <SiteLinkItem href={routes.transparency}>Transparence</SiteLinkItem>
            <SiteLinkItem href={routes.legal}>Mentions légales</SiteLinkItem>
            <SiteLinkItem href={routes.privacy}>Confidentialité</SiteLinkItem>
          </ul>
          <p>
            Made by <a href={PORTFOLIO_URL} target="_blank" rel="noopener">{PUBLISHER_NAME}</a>
            {(usesLogoDev() || logoDev) && <> · <a href="https://logo.dev" target="_blank" rel="noopener">Logos provided by Logo.dev</a></>}
          </p>
        </footer>
      </aside>
      <button type="button" className="k-ex-scrim" aria-label="Fermer la colonne" tabIndex={drawer ? 0 : -1} onClick={() => setDrawer(false)} />

      <div className="k-ex-body">
        <header className="k-ex-bar">
          <div className="k-ex-bar-start">
            <Burger label="Ouvrir les rayons" />
            <Logo />
          </div>
          <form className="k-ex-search" role="search" onSubmit={event => { event.preventDefault(); submit(); }}>
            <label className="k-sr" htmlFor="k-ex-q">Chercher un code</label>
            <input ref={input} id="k-ex-q" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Un outil, un créateur, un code…" autoComplete="off" maxLength={80} />
            {query
              ? <button type="button" className="k-ex-search-clear" onClick={() => { setQuery(''); input.current?.focus(); }} aria-label="Effacer la recherche">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
                </button>
              : <kbd className="k-kbd" aria-hidden="true">/</kbd>}
            <button type="submit" className="k-ex-search-go" aria-label="Chercher">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            </button>
          </form>
          <div className="k-ex-bar-end">
            <CreateMenu />
            <button type="button" className="k-icon-btn" aria-pressed={sound} aria-label={sound ? 'Couper le son des coupons' : 'Activer le son des coupons'} onClick={() => setSoundEnabled(!sound)}>
              {sound
                ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4V5z" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M19 5a10 10 0 0 1 0 14" /></svg>
                : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4V5z" /><path d="m22 9-6 6" /><path d="m16 9 6 6" /></svg>}
            </button>
            <ThemeToggle />
            <CreatorButton />
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}
