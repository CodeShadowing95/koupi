'use client';
// Page Explorer : l'expérience « je viens, je cherche, je prends mon code, je repars ».
// Colonne de rayons sur toute la hauteur (réduite en icônes d'un clic, tiroir sous 980 px), barre du haut avec la recherche,
// pastilles de catégories qui défilent, puis les coupons, trois par ligne, qui se chargent au fil du défilement.
// En tête, une fois par navigateur, le message « Copie, essaie, reviens voter » ; le vote se fait sur le coupon même
// (pouces à droite du nom de l'outil) et la fenêtre « Laisse un 👍 » le rappelle au retour du visiteur.
import Link from '@/components/site/site-pages';
import { ExploreShell, type ShellActive } from '@/components/site/explore-shell';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Category, Code, Family, Tool } from '@/lib/data';
import { routes } from '@/lib/routes';
import { gsap, MOTION_OK, useGSAP } from '@/lib/gsap';
import {
  categoryChips, closeIntro, totalVotes, DEFAULT_EXPLORE, exploreCodes, exploreTitle, exploreToParams, readIntroClosed,
  type ExploreState,
} from '@/lib/explore';
import { BoardingCoupon } from '@/components/site/boarding-coupon';
import { CodeViewToggles, codeGridClass, useCodeViews } from '@/components/site/code-view-toggles';
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
  const [intro, setIntro] = useState(false);
  const { cards, chooseCards } = useCodeViews();
  const feed = useRef<HTMLElement>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const entered = useRef(0);
  const shownState = useRef<ExploreState | null>(null);

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

  // Le message « Copie, essaie, reviens voter » s'affiche une fois par navigateur.
  useEffect(() => { setIntro(!readIntroClosed(window.localStorage)); }, []);

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
    feed.current?.scrollIntoView({ block: 'start' });
  };
  const hideIntro = () => { setIntro(false); closeIntro(window.localStorage); };

  const active: ShellActive = state.query ? null
    : state.creator ? { kind: 'creator', slug: state.creator }
    : state.family ? { kind: 'family', slug: state.family }
    : browsing ? { kind: 'shelf', shelf: state.shelf } : null;

  return (
    <ExploreShell codes={codes} tools={tools} families={families} now={now} active={active} onGo={go} skipLabel="Aller aux codes" logoDev={logoDev}
      search={{ value: query, onChange: setQuery, onSubmit: () => setState(current => ({ ...DEFAULT_EXPLORE, ...(current.query === query.trim() ? current : {}), query: query.trim() })) }}>
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
    </ExploreShell>
  );
}
