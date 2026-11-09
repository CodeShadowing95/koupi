'use client';
// Page Explorer : l'expérience « je viens, je cherche, je prends mon code, je repars ».
// Colonne de rayons sur toute la hauteur (réduite en icônes d'un clic, tiroir sous 980 px), barre du haut avec la recherche,
// pastilles de catégories qui défilent, puis les coupons, trois par ligne, qui se chargent au fil du défilement.
// En tête, une fois par navigateur, le message « Copie, essaie, reviens voter » ; le vote se fait sur le coupon même
// (pouces à droite du nom de l'outil) et la fenêtre « Laisse un 👍 » le rappelle au retour du visiteur.
import { SiteLogo } from '@/components/site/site-logo';
import { ThemeToggle } from '@/components/site/theme-toggle';
import Link, { SiteLinkItem, useIsOff } from '@/components/site/site-pages';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Category, Code, Family, Tool } from '@/lib/data';
import { routes } from '@/lib/routes';
import { isSoundEnabled, setSoundEnabled } from '@/lib/coupon-sound';
import { usesLogoDev } from '@/lib/tool-logos';
import { gsap, MOTION_OK, useGSAP } from '@/lib/gsap';
import {
  categoryChips, closeIntro, totalVotes, DEFAULT_EXPLORE, EXPLORE_RAIL_KEY, exploreCodes, exploreTitle, exploreToParams, familyEntries, readIntroClosed, SHELVES, shortName, topCreators,
  type ExploreState, type Shelf,
} from '@/lib/explore';
import { BoardingCoupon } from '@/components/site/boarding-coupon';
import { CodeViewToggles, codeGridClass, useCodeViews } from '@/components/site/code-view-toggles';
import { CreatorAvatar } from '@/components/site/creator-avatar';
import { CreatorMark } from '@/components/site/creator-mark';
import { CreateList, CreateMenu, CreatorButton } from '@/components/site/create-menu';
import { FamilyIcon, ShelfIcon } from '@/components/site/explore-icons';
import { PORTFOLIO_URL, PUBLISHER_NAME } from '@/lib/site-contact';
import { SeasonBanner } from '@/components/site/season-banner';
import { bannerPicks, currentSeason } from '@/lib/season-banner';

const PAGE = 12;

type Props = {
  codes: Code[];
  tools: Tool[];
  families: Family[];
  categories: Pick<Category, 'slug' | 'name' | 'family'>[];
  initial: ExploreState;
  now: number;
  logoDev?: boolean;
};

export function Explore({ codes, tools, families, categories, initial, now, logoDev = false }: Props) {
  const [state, setState] = useState<ExploreState>(initial);
  const [query, setQuery] = useState(initial.query);
  const [limit, setLimit] = useState(PAGE);
  const [mini, setMini] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [intro, setIntro] = useState(false);
  const [sound, setSound] = useState(true);
  const { cards, chooseCards } = useCodeViews();
  const feed = useRef<HTMLElement>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const entered = useRef(0);
  const shownState = useRef<ExploreState | null>(null);
  const isOff = useIsOff();

  // Espaces insécables écrits à la main : même texte côté serveur et navigateur.
  // Bannière de saison : la date vient du serveur (now) pour que le rendu serveur et le navigateur montrent la même.
  const season = useMemo(() => currentSeason(new Date(now)), [now]);
  const seasonPicks = useMemo(() => {
    if (!season) return [];
    const familyOf = new Map(tools.map(tool => [tool.slug, tool.family]));
    return bannerPicks(codes.map(code => ({ ...code, family: familyOf.get(code.toolSlug) })), 4);
  }, [season, codes, tools]);
  const votes = useMemo(() => new Intl.NumberFormat('fr-FR').format(totalVotes(codes)).replace(/\s/g, '\u00a0'), [codes]);
  const results = useMemo(() => exploreCodes(codes, tools, state, now), [codes, tools, state, now]);
  const visible = results.slice(0, limit);
  const shelfCounts = useMemo(() => Object.fromEntries(SHELVES.map(({ value }) => [value, exploreCodes(codes, tools, { ...DEFAULT_EXPLORE, shelf: value }, now).length])) as Record<Shelf, number>, [codes, tools, now]);
  const familyList = useMemo(() => familyEntries(codes, tools, families), [codes, tools, families]);
  const creators = useMemo(() => topCreators(codes, 7), [codes]);
  const chips = useMemo(() => categoryChips(exploreCodes(codes, tools, { ...state, category: '' }, now), tools, categories, state.family), [codes, tools, categories, state, now]);
  const familyName = useMemo(() => new Map(families.map(family => [family.slug, family.name])), [families]);
  const creatorName = useMemo(() => new Map(codes.map(code => [code.creatorSlug, code.creator])), [codes]);
  const toolSite = useMemo(() => new Map(tools.map(tool => [tool.slug, tool.website])), [tools]);
  const toolCategory = useMemo(() => new Map(tools.map(tool => [tool.slug, tool.category])), [tools]);
  const title = exploreTitle(state, {
    family: slug => familyName.get(slug) ?? 'Famille',
    creator: slug => creatorName.get(slug) ?? 'ce créateur',
  });
  const browsing = !state.family && !state.creator && !state.query;

  // Préférences du navigateur : colonne réduite, message déjà fermé, son des coupons.
  useEffect(() => {
    try { setMini(window.localStorage.getItem(EXPLORE_RAIL_KEY) === 'mini'); } catch { /* stockage indisponible */ }
    setIntro(!readIntroClosed(window.localStorage));
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
        search.current?.focus();
      }
      if (event.key === 'Escape') setDrawer(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // La recherche porte sur tout le comptoir et attend une courte pause dans la frappe.
  useEffect(() => {
    const timer = window.setTimeout(() => setState(current => (current.query === query.trim() ? current : { ...DEFAULT_EXPLORE, query: query.trim() })), 220);
    return () => window.clearTimeout(timer);
  }, [query]);

  // L'adresse suit ce qu'on regarde : un lien partagé rouvre la même vue. Chaque changement repart du haut.
  useEffect(() => {
    const params = exploreToParams(state).toString();
    window.history.replaceState(null, '', params ? `?${params}` : window.location.pathname);
    setLimit(PAGE);
  }, [state]);

  // Défilement infini : douze coupons de plus quand le bas de la grille approche.
  useEffect(() => {
    const target = sentinel.current;
    if (!target || limit >= results.length) return;
    const observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) setLimit(current => current + PAGE); }, { rootMargin: '600px 0px' });
    observer.observe(target);
    return () => observer.disconnect();
  }, [limit, results.length]);

  // Le tiroir ouvert sur mobile bloque le défilement de la page derrière.
  useEffect(() => {
    document.documentElement.classList.toggle('k-menu-lock', drawer);
    return () => document.documentElement.classList.remove('k-menu-lock');
  }, [drawer]);

  // Les coupons qui viennent d'apparaître montent doucement, un par un.
  useGSAP(() => {
    if (shownState.current !== state) { shownState.current = state; entered.current = 0; }
    const items = gsap.utils.toArray<HTMLElement>('.k-ex-cell', feed.current).slice(entered.current);
    entered.current += items.length;
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      gsap.fromTo(items, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.4, stagger: 0.04, ease: 'power2.out', clearProps: 'transform' });
    });
  }, { scope: feed, dependencies: [state, limit] });

  const go = (next: Partial<ExploreState>) => {
    setQuery(next.query ?? '');
    setState({ ...DEFAULT_EXPLORE, ...next });
    setDrawer(false);
    feed.current?.scrollIntoView({ block: 'start' });
  };
  const toggleRail = () => {
    if (window.matchMedia('(max-width: 980px)').matches) { setDrawer(open => !open); return; }
    setMini(current => {
      try { window.localStorage.setItem(EXPLORE_RAIL_KEY, current ? 'full' : 'mini'); } catch { /* stockage indisponible */ }
      return !current;
    });
  };
  const hideIntro = () => { setIntro(false); closeIntro(window.localStorage); };

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
      <a className="k-skip" href="#contenu">Aller aux codes</a>

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
                <button type="button" className="k-ex-item" aria-current={browsing && state.shelf === value ? 'page' : undefined} onClick={() => go({ shelf: value })} title={label}>
                  <ShelfIcon shelf={value} />
                  <span className="k-ex-item-label">{label}</span>
                  <span className="k-ex-item-short" aria-hidden="true">{short}</span>
                  <span className="k-ex-item-count">{shelfCounts[value]}</span>
                </button>
              </li>
            ))}
          </ul>

          {familyList.length > 0 && <>
            <h2 className="k-ex-group-title">Familles</h2>
            <ul className="k-ex-group">
              {familyList.map(family => (
                <li key={family.slug}>
                  <button type="button" className="k-ex-item" aria-current={!state.creator && !state.query && state.family === family.slug ? 'page' : undefined} onClick={() => go({ family: family.slug })} title={family.name}>
                    <FamilyIcon family={family.slug} />
                    <span className="k-ex-item-label">{family.name}</span>
                    <span className="k-ex-item-short" aria-hidden="true">{shortName(family.name)}</span>
                    <span className="k-ex-item-count">{family.count}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>}

          {creators.length > 0 && <>
            <h2 className="k-ex-group-title">Créateurs</h2>
            <ul className="k-ex-group is-creators">
              {creators.map(creator => (
                <li key={creator.slug}>
                  <button type="button" className="k-ex-item" aria-current={!state.query && state.creator === creator.slug ? 'page' : undefined} onClick={() => go({ creator: creator.slug })} title={creator.name}>
                    <CreatorAvatar name={creator.name} size="xs" />
                    <span className="k-ex-item-label">{creator.name}<CreatorMark level={creator.level} compact /></span>
                    <span className="k-ex-item-count">{creator.count}</span>
                  </button>
                </li>
              ))}
              {!isOff(routes.creators()) && <li><Link className="k-ex-item is-more" href={routes.creators()}><span className="k-ex-more-dots" aria-hidden="true">···</span><span className="k-ex-item-label">Tous les créateurs</span></Link></li>}
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
            <SiteLinkItem href={routes.codes}>Page Codes classique</SiteLinkItem>
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
          <form className="k-ex-search" role="search" onSubmit={event => { event.preventDefault(); setState(current => ({ ...DEFAULT_EXPLORE, ...(current.query === query.trim() ? current : {}), query: query.trim() })); }}>
            <label className="k-sr" htmlFor="k-ex-q">Chercher un code</label>
            <input ref={search} id="k-ex-q" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Un outil, un créateur, un code…" autoComplete="off" maxLength={80} />
            {query
              ? <button type="button" className="k-ex-search-clear" onClick={() => { setQuery(''); search.current?.focus(); }} aria-label="Effacer la recherche">
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

        {chips.length > 1 && (
          <nav className="k-ex-chips" aria-label="Catégories">
            <button type="button" className="k-ex-chip" aria-pressed={!state.category} onClick={() => setState(current => ({ ...current, category: '' }))}>Tout</button>
            {chips.map(chip => (
              <button key={chip.slug} type="button" className="k-ex-chip" aria-pressed={state.category === chip.name}
                onClick={() => setState(current => ({ ...current, category: current.category === chip.name ? '' : chip.name }))}>
                {chip.name}<small>{chip.count}</small>
              </button>
            ))}
          </nav>
        )}

        <main className="k-ex-feed" id="contenu" ref={feed}>
          {season && seasonPicks.length > 0 && <SeasonBanner season={season} picks={seasonPicks} />}
          {intro && (
            <section className="k-ex-intro" aria-labelledby="k-ex-intro-title">
              <div className="k-ex-intro-main k-paper">
                <span className="k-ex-intro-kicker">Après ton achat</span>
                <h2 className="k-ex-intro-title" id="k-ex-intro-title">Le code a marché&nbsp;? <em>Dis-le</em> en un pouce.</h2>
                <ol className="k-ex-intro-steps">
                  <li><b>1</b>Copie le code</li>
                  <li><b>2</b>Essaie-le en payant</li>
                  <li><b>3</b>Reviens voter</li>
                </ol>
              </div>
              <div className="k-ex-intro-side">
                <svg className="k-ex-intro-thumb" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M2 21h4V9H2v12Zm20-11a2 2 0 0 0-2-2h-6.3l.95-4.57.03-.32a1.5 1.5 0 0 0-.44-1.06L13.17 1 6.59 7.59C6.22 7.95 6 8.45 6 9v10a2 2 0 0 0 2 2h9a2 2 0 0 0 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2Z" /></svg>
                {votes !== '0' && <span className="k-ex-intro-count"><b>{votes}</b> votes déjà</span>}
                <button type="button" className="k-ex-intro-ok" onClick={hideIntro}>C’est noté</button>
              </div>
            </section>
          )}

          <div className="k-ex-head">
            <h1>{title}</h1>
            <div className="k-ex-head-end">
              <p className="k-ex-count" aria-live="polite">{results.length} {results.length > 1 ? 'codes' : 'code'}</p>
              <CodeViewToggles cards={cards} onCards={chooseCards} />
            </div>
          </div>

          {results.length > 0
            ? <ul className={codeGridClass(cards, 'k-ex-grid')}>
                {visible.map(code => (
                  <li key={code.id} className="k-ex-cell">
                    <BoardingCoupon code={code} link={code.creatorLink || toolSite.get(code.toolSlug) || '#'} category={toolCategory.get(code.toolSlug) || undefined}
                      light={cards === 'simple'} votes={cards === 'simple'} />
                  </li>
                ))}
              </ul>
            : <div className="k-ex-empty">
                <p className="k-ex-empty-title">Aucun code ici pour l’instant.</p>
                <p>Essaie un autre mot ou repars de tout le comptoir. Tu as vu un code chez un créateur&nbsp;? Propose-le, on le vérifie.</p>
                <div className="k-ex-empty-actions">
                  <button type="button" className="k-btn k-btn-ghost k-btn-sm" onClick={() => go({})}>Voir tous les codes</button>
                  <Link className="k-btn k-btn-primary k-btn-sm" href={routes.submit()}>Proposer un code</Link>
                </div>
              </div>}

          {limit < results.length && (
            <div ref={sentinel} className="k-ex-more">
              <button type="button" className="k-btn k-btn-ghost k-btn-sm" onClick={() => setLimit(current => current + PAGE)}>
                Afficher {Math.min(PAGE, results.length - limit)} codes de plus
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
