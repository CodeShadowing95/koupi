'use client';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import type { Code, Tool } from '@/lib/data';
import { type CodeFilters, type CodeSort, type CodeStatusFilter, DEFAULT_FILTERS, filterCodes } from '@/lib/codes-board';
import { routes } from '@/lib/routes';
import { Flip, gsap, MOTION_OK, useGSAP } from '@/lib/gsap';
import { BoardingCoupon } from '@/components/site/boarding-coupon';
import { AdminSelect, type SelectOption } from '@/components/admin-select';

// « Tous les codes » : la recherche et les filtres (statut, catégorie dans une liste avec recherche, tri) à gauche,
// les coupons à droite, trois par ligne. Les animations restent simples :
// les coupons sortent en fondu quand on change un filtre, puis les nouveaux entrent.
// Les filtres sont recopiés dans l'adresse pour pouvoir partager une recherche.
// Deux vues : « étendue » (coupon debout, toutes les infos) et « brève » (coupon couché, talon à droite,
// l'essentiel). Au changement, chaque coupon se transforme sur place (GSAP Flip) ; le choix est retenu.

const PAGE = 12; // 4 lignes de 3 coupons
const STATUSES: { value: CodeStatusFilter; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'verified', label: 'Vérifiés' },
  { value: 'to_test', label: 'À tester' },
];
const SORTS: { value: CodeSort; label: string }[] = [
  { value: 'best', label: 'Les plus fiables' },
  { value: 'votes', label: 'Les plus votés' },
  { value: 'recent', label: 'Les plus récents' },
];

type Props = { codes: Code[]; tools: Tool[]; categories: { slug: string; name: string }[]; initial: CodeFilters };

type View = 'wide' | 'brief';
const VIEW_KEY = 'koupi-codes-view';
// Les morceaux du coupon qui glissent vers leur nouvelle place quand on change de vue.
const FLIP_TARGETS = '.k-board-item, .k-pass, .k-pass-main, .k-pass-stub, .k-pass-head, .k-pass-head .k-tool-logo, .k-pass-title strong, .k-pass-who, .k-pass-facts .is-wide, .k-pass-stub-code, .k-pass-action';

const reduced = () => typeof window !== 'undefined' && !window.matchMedia(MOTION_OK).matches;

export function CodesBoard({ codes, tools, categories, initial }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const [filters, setFilters] = useState<CodeFilters>(initial);
  const [query, setQuery] = useState(initial.query);
  const [shown, setShown] = useState<CodeFilters>(initial);
  const [limit, setLimit] = useState(PAGE);
  const entered = useRef(0);
  const [view, setView] = useState<View>('wide');

  // La vue choisie la dernière fois (préférence de ce navigateur seulement).
  useEffect(() => {
    try { if (window.localStorage.getItem(VIEW_KEY) === 'brief') setView('brief'); } catch { /* stockage indisponible */ }
  }, []);

  const switchView = (next: View) => {
    if (next === view) return;
    try { window.localStorage.setItem(VIEW_KEY, next); } catch { /* stockage indisponible */ }
    const box = root.current;
    if (!box || reduced()) { setView(next); return; }
    const state = Flip.getState(box.querySelectorAll(FLIP_TARGETS));
    flushSync(() => setView(next));
    Flip.from(state, {
      duration: 0.7, ease: 'power3.inOut', nested: true, stagger: 0.015,
      onEnter: elements => gsap.fromTo(elements, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.35, delay: 0.45 }),
    });
  };

  const toolBySlug = useMemo(() => new Map(tools.map(tool => [tool.slug, tool])), [tools]);
  const results = useMemo(() => filterCodes(codes, tools, shown), [codes, tools, shown]);
  const visible = results.slice(0, limit);
  const perCategory = useMemo(() => {
    const counts = new Map<string, number>();
    for (const code of codes) {
      const category = toolBySlug.get(code.toolSlug)?.category;
      if (category) counts.set(category, (counts.get(category) ?? 0) + 1);
    }
    return counts;
  }, [codes, toolBySlug]);
  const categoryOptions = useMemo<SelectOption[]>(() => [
    { value: '', label: 'Toutes les catégories', hint: String(codes.length) },
    ...categories.map(category => ({ value: category.name, label: category.name, hint: String(perCategory.get(category.name) ?? 0) })),
  ], [categories, codes.length, perCategory]);

  // La recherche texte attend une courte pause dans la frappe avant de filtrer.
  useEffect(() => {
    const timer = window.setTimeout(() => setFilters(current => (current.query === query ? current : { ...current, query })), 220);
    return () => window.clearTimeout(timer);
  }, [query]);

  // Changement de filtre : les coupons affichés sortent, puis la nouvelle liste prend leur place.
  useEffect(() => {
    if (JSON.stringify(filters) === JSON.stringify(shown)) return;
    const params = new URLSearchParams();
    if (filters.query) params.set('q', filters.query);
    if (filters.category) params.set('category', filters.category);
    if (filters.status !== DEFAULT_FILTERS.status) params.set('status', filters.status);
    if (filters.sort !== DEFAULT_FILTERS.sort) params.set('sort', filters.sort);
    const search = params.toString();
    window.history.replaceState(null, '', search ? `?${search}` : window.location.pathname);

    const swap = () => { entered.current = 0; setLimit(PAGE); setShown(filters); };
    const cards = root.current?.querySelectorAll('.k-board-item');
    if (!cards?.length || reduced()) { swap(); return; }
    const tween = gsap.to(cards, { autoAlpha: 0, y: -10, duration: 0.16, stagger: 0.015, ease: 'power1.in', onComplete: swap });
    return () => { tween.kill(); };
  }, [filters, shown]);

  // Les nouveaux coupons entrent par le bas, un par un (seulement ceux qui viennent d'apparaître).
  useGSAP(() => {
    const items = gsap.utils.toArray<HTMLElement>('.k-board-item', root.current).slice(entered.current);
    entered.current += items.length;
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      gsap.fromTo(items, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.45, stagger: 0.05, ease: 'power2.out', clearProps: 'transform' });
    });
  }, { scope: root, dependencies: [shown, limit] });

  const update = (patch: Partial<CodeFilters>) => setFilters(current => ({ ...current, ...patch }));
  const reset = () => { setQuery(''); setFilters(DEFAULT_FILTERS); };
  const active = filters.query || filters.category || filters.status !== 'all';

  return (
    <div className={`k-board${view === 'brief' ? ' is-brief' : ''}`} ref={root}>
      <aside className="k-board-side" aria-label="Filtres">
        <form role="search" onSubmit={event => event.preventDefault()}>
          <label className="k-board-search">
            <span className="k-sr">Chercher un outil, un créateur ou un code</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Outil, créateur, code…" maxLength={80} />
          </label>
        </form>

        <div className="k-board-group">
          <h2>Statut</h2>
          <div className="k-board-seg">
            {STATUSES.map(status => (
              <button type="button" key={status.value} aria-pressed={filters.status === status.value} onClick={() => update({ status: status.value })}>{status.label}</button>
            ))}
          </div>
        </div>

        <div className="k-board-group">
          <h2>Catégorie</h2>
          <AdminSelect
            id="k-board-category" classPrefix="k-combo" ariaLabel="Catégorie"
            value={filters.category} onChange={category => update({ category })}
            options={categoryOptions} searchPlaceholder="Chercher une catégorie…"
          />
        </div>

        <label className="k-board-group">
          <h2>Trier par</h2>
          <select className="k-board-select" value={filters.sort} onChange={event => update({ sort: event.target.value as CodeSort })}>
            {SORTS.map(sort => <option key={sort.value} value={sort.value}>{sort.label}</option>)}
          </select>
        </label>
      </aside>

      <div className="k-board-results">
      <div className="k-board-bar">
        <p role="status"><strong>{results.length}</strong> {results.length > 1 ? 'codes trouvés' : 'code trouvé'}</p>
        <div className="k-board-tools">
          {active && <button type="button" className="k-link" onClick={reset}>Effacer les filtres</button>}
          <div className="k-board-views" role="group" aria-label="Affichage des codes">
            <button type="button" aria-pressed={view === 'wide'} onClick={() => switchView('wide')} title="Vue étendue : toutes les infos">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="7.5" height="18" rx="2" /><rect x="13.5" y="3" width="7.5" height="18" rx="2" /><path d="M3 15h7.5M13.5 15H21" strokeDasharray="1.5 2" /></svg>
              Étendue
            </button>
            <button type="button" aria-pressed={view === 'brief'} onClick={() => switchView('brief')} title="Vue brève : l'essentiel">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="6.5" rx="2" /><rect x="3" y="13.5" width="18" height="6.5" rx="2" /><path d="M15 4v6.5M15 13.5V20" strokeDasharray="1.5 2" /></svg>
              Brève
            </button>
          </div>
        </div>
      </div>

      {results.length === 0 ? (
        <div className="k-empty k-board-item">
          <h2>Aucun code pour cette recherche.</h2>
          <p>Essaie un autre outil ou une autre catégorie. Tu as vu passer un code dans une vidéo&nbsp;? Propose-le.</p>
          <Link className="k-btn k-btn-paper k-btn-ticket" href={routes.submit()}>Proposer un code</Link>
        </div>
      ) : (
        <ul className="k-board-list">
          {visible.map(code => {
            const tool = toolBySlug.get(code.toolSlug);
            return (
              <li className="k-board-item" key={code.id}>
                <BoardingCoupon code={code} category={tool?.category} link={code.creatorLink || tool?.website || '#'} />
              </li>
            );
          })}
        </ul>
      )}

      {results.length > limit && (
        <div className="k-board-more">
          <button type="button" className="k-btn k-btn-ghost" onClick={() => setLimit(current => current + PAGE)}>
            Afficher {Math.min(PAGE, results.length - limit)} codes de plus
          </button>
        </div>
      )}
      </div>
    </div>
  );
}
