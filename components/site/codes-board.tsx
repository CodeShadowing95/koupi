'use client';
import Link from '@/components/site/site-pages';
import { useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import type { Code, Family, Tool } from '@/lib/data';
import {
  activeFilters, type CodeFilters, type CodeSort, type CodeStatusFilter, DEADLINES, DEFAULT_FILTERS, facetCounts, filterCodes,
  filtersToParams, isBrowsing, browseRows, type FacetCounts, lastChanceCodes, OFFERS, relaxSuggestions, type TrustFilter, TRUSTS,
} from '@/lib/codes-board';
import { routes } from '@/lib/routes';
import { Flip, gsap, MOTION_OK, useGSAP } from '@/lib/gsap';
import { BoardingCoupon } from '@/components/site/boarding-coupon';
import { TrustGlyph } from '@/components/site/trust';
import { ToolLogo } from '@/components/site/tool-logo';
import { AdminSelect, type SelectOption } from '@/components/admin-select';
import { ChipRow } from '@/components/site/chip-row';

// « Tous les codes » : en haut, une barre de pastilles comme sur YouTube (les familles de catégories, puis les
// catégories de la famille choisie). Dessous, la recherche, le bouton « Filtres » et le tri. Le bouton ouvre une fenêtre
// avec tous les autres filtres (statut, outil, créateur, confiance, type d'offre, échéance, nouveautés), chacun avec
// le nombre de codes qu'il donnerait ; le bouton du bas dit en direct combien de codes on verra (« Afficher 42 codes »).
// Rien ne change tant qu'on n'a pas validé. Les filtres choisis s'affichent en pastilles au-dessus des coupons.
// Sans aucun filtre, des rangées thématiques qui défilent sur le côté (testés au paiement, nouveautés, familles,
// créateurs…) passent avant la liste complète ; « Tout voir » applique le filtre de la rangée.
// Un bandeau « Dernière chance » montre les codes qui expirent sous 7 jours. Sans résultat, un coupon vierge
// propose les filtres à retirer et invite à proposer un code. Les animations restent simples :
// les coupons sortent en fondu quand on change un filtre, puis les nouveaux entrent.
// Les filtres sont recopiés dans l'adresse pour pouvoir partager une recherche.
// Deux vues : « Cartes » (coupon debout, toutes les infos) et « Liste » (un coupon couché par ligne,
// talon à droite, l'essentiel), affichée par défaut. Au changement, chaque coupon se transforme sur place (GSAP Flip) ; le choix est retenu.

const PAGE = 12;
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

type Props = {
  codes: Code[]; tools: Tool[]; families: Family[]; categories: { slug: string; name: string; family: string | null }[]; initial: CodeFilters;
  /** Heure du serveur, pour que les filtres par date donnent le même résultat au rendu et dans le navigateur. */
  now: number;
};

type View = 'cards' | 'list';
const VIEW_KEY = 'koupi-codes-view';
// Les morceaux du coupon qui glissent vers leur nouvelle place quand on change de vue.
const FLIP_TARGETS = '.k-board-item, .k-pass, .k-pass-main, .k-pass-stub, .k-pass-logo, .k-pass-actions, .k-pass-title strong, .k-pass-who, .k-pass-discount, .k-pass-stub-code, .k-pass-action';

const count = (value: number | undefined) => String(value ?? 0);

const reduced = () => typeof window !== 'undefined' && !window.matchMedia(MOTION_OK).matches;

export function CodesBoard({ codes, tools, families, categories, initial, now }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const [filters, setFilters] = useState<CodeFilters>(initial);
  const [query, setQuery] = useState(initial.query);
  const [shown, setShown] = useState<CodeFilters>(initial);
  const [limit, setLimit] = useState(PAGE);
  const entered = useRef(0);
  const [view, setView] = useState<View>('list');
  // Fenêtre « Filtres » : on règle un brouillon, appliqué seulement avec « Afficher n codes ».
  const dialog = useRef<HTMLDialogElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState<CodeFilters>(initial);

  // La vue choisie la dernière fois (préférence de ce navigateur seulement).
  useEffect(() => {
    // La liste est affichée par défaut ; seules les cartes choisies explicitement sont retenues.
    try { if (window.localStorage.getItem(VIEW_KEY) === 'cards') setView('cards'); } catch { /* stockage indisponible */ }
  }, []);

  const switchView = (next: View) => {
    if (next === view) return;
    try { window.localStorage.setItem(VIEW_KEY, next); } catch { /* stockage indisponible */ }
    const box = root.current;
    if (!box || reduced()) { setView(next); return; }
    const state = Flip.getState(box.querySelectorAll(FLIP_TARGETS));
    flushSync(() => setView(next));
    Flip.from(state, {
      duration: 0.7, ease: 'power3.inOut', nested: true, stagger: { amount: 0.2 },
      onEnter: elements => gsap.fromTo(elements, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.35, delay: 0.45 }),
    });
  };

  const toolBySlug = useMemo(() => new Map(tools.map(tool => [tool.slug, tool])), [tools]);
  const results = useMemo(() => filterCodes(codes, tools, shown, now), [codes, tools, shown, now]);
  const visible = results.slice(0, limit);
  const counts = useMemo(() => facetCounts(codes, tools, filters, now), [codes, tools, filters, now]);
  const creatorNames = useMemo(() => new Map(codes.map(code => [code.creatorSlug, code.creator])), [codes]);
  const familyNames = useMemo(() => new Map(families.map(family => [family.slug, family.name])), [families]);
  // Famille affichée : celle choisie, ou celle de la catégorie reçue dans l'adresse (lien partagé, fiche outil).
  const openFamily = filters.family || categories.find(category => category.name === filters.category)?.family || '';
  const familyChips = families.filter(family => (counts.family[family.slug] ?? 0) > 0 || family.slug === openFamily);
  const categoryChips = categories.filter(category => category.family === openFamily && ((counts.category[category.name] ?? 0) > 0 || category.name === filters.category));
  const toolsWithCodes = useMemo(() => tools.filter(tool => codes.some(code => code.toolSlug === tool.slug))
    .sort((a, b) => a.name.localeCompare(b.name, 'fr')), [tools, codes]);
  const toolOptionsFor = (facets: FacetCounts): SelectOption[] => [
    { value: '', label: 'Tous les outils', hint: count(Object.values(facets.tool).reduce((a, b) => a + b, 0)) },
    ...toolsWithCodes.map(tool => ({ value: tool.slug, label: tool.name, hint: count(facets.tool[tool.slug]) })),
  ];
  const creatorOptionsFor = (facets: FacetCounts): SelectOption[] => [
    { value: '', label: 'Tous les créateurs', hint: count(Object.values(facets.creator).reduce((a, b) => a + b, 0)) },
    ...[...creatorNames].sort((a, b) => a[1].localeCompare(b[1], 'fr'))
      .map(([slug, name]) => ({ value: slug, label: name, hint: count(facets.creator[slug]) })),
  ];
  const draftCounts = useMemo(() => facetCounts(codes, tools, draft, now), [codes, tools, draft, now]);
  const draftTotal = useMemo(() => filterCodes(codes, tools, draft, now).length, [codes, tools, draft, now]);
  const browsing = isBrowsing(shown);
  const rows = useMemo(() => browseRows(codes, tools, families, now), [codes, tools, families, now]);
  // La famille et la catégorie se lisent sur les pastilles du haut : elles ne sont pas répétées au-dessus des coupons.
  const pills = activeFilters(filters, {
    tool: slug => toolBySlug.get(slug)?.name ?? '',
    creator: slug => creatorNames.get(slug) ?? '',
  }).filter(pill => pill.key !== 'family' && pill.key !== 'category');
  const lastChance = useMemo(() => lastChanceCodes(codes, now, 99), [codes, now]);
  const relax = useMemo(() => (results.length > 0 ? [] : relaxSuggestions(codes, tools, shown, activeFilters(shown, {
    tool: slug => toolBySlug.get(slug)?.name ?? '',
    creator: slug => creatorNames.get(slug) ?? '',
    family: slug => familyNames.get(slug) ?? '',
  }), now)), [results.length, codes, tools, shown, now, toolBySlug, creatorNames, familyNames]);
  // Les filtres choisis hors recherche, affichés sur le bouton « Filtres ».
  const panelActive = pills.filter(pill => pill.key !== 'q').length;

  // La recherche texte attend une courte pause dans la frappe avant de filtrer.
  useEffect(() => {
    const timer = window.setTimeout(() => setFilters(current => (current.query === query ? current : { ...current, query })), 220);
    return () => window.clearTimeout(timer);
  }, [query]);

  // Changement de filtre : les coupons affichés sortent, puis la nouvelle liste prend leur place.
  useEffect(() => {
    if (JSON.stringify(filters) === JSON.stringify(shown)) return;
    const search = filtersToParams(filters).toString();
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
  const reset = () => { setQuery(''); setFilters(current => ({ ...DEFAULT_FILTERS, sort: current.sort })); };
  const remove = (patch: Partial<CodeFilters>) => { if ('query' in patch) setQuery(''); update(patch); };
  const toFilters = () => root.current?.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
  const openFilters = () => { setDraft({ ...filters, query }); setDialogOpen(true); dialog.current?.showModal(); };
  const applyFilters = () => { update(draft); dialog.current?.close(); };
  const seeRow = (patch: Partial<CodeFilters>) => { update(patch); toFilters(); };

  return (
    <div className={`k-board${view === 'list' ? ' is-list' : ''}`} ref={root}>
      {familyChips.length > 0 && (
        <nav className="k-board-cats" aria-label="Catégories">
          <ChipRow label="Familles">
            <button type="button" className="k-cat-chip" aria-pressed={!openFamily && !filters.category} onClick={() => update({ family: '', category: '' })}>
              Tous <span>{counts.allFamilies}</span>
            </button>
            {familyChips.map(family => {
              const on = openFamily === family.slug;
              return (
                <button type="button" key={family.slug} className="k-cat-chip" aria-pressed={on}
                  onClick={() => update(on ? { family: '', category: '' } : { family: family.slug, category: '' })}>
                  {family.name} <span>{counts.family[family.slug] ?? 0}</span>
                </button>
              );
            })}
          </ChipRow>
          {categoryChips.length > 1 && (
            <ChipRow className="is-sub" label={`Catégories de ${familyNames.get(openFamily) ?? 'la famille'}`}>
              {categoryChips.map(category => {
                const on = filters.category === category.name;
                return (
                  <button type="button" key={category.slug} className="k-cat-chip is-sub" aria-pressed={on}
                    onClick={() => update({ family: openFamily, category: on ? '' : category.name })}>
                    {category.name} <span>{counts.category[category.name] ?? 0}</span>
                  </button>
                );
              })}
            </ChipRow>
          )}
        </nav>
      )}
      <div className="k-board-toolbar">
        <form role="search" onSubmit={event => event.preventDefault()}>
          <label className="k-board-search">
            <span className="k-sr">Chercher un outil, un créateur ou un code</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Outil, créateur, code…" maxLength={80} />
          </label>
        </form>
        <button type="button" className="k-board-filter-btn" aria-haspopup="dialog" onClick={openFilters}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4" /></svg>
          Filtres
          {panelActive > 0 && <span className="k-board-count is-on">{panelActive}</span>}
        </button>
        <label className="k-board-sort">
          <span className="k-sr">Trier par</span>
          <select className="k-board-select" value={filters.sort} onChange={event => update({ sort: event.target.value as CodeSort })}>
            {SORTS.map(sort => <option key={sort.value} value={sort.value}>{sort.label}</option>)}
          </select>
        </label>
      </div>

      <dialog ref={dialog} className="k-req-dialog k-filters-dialog" aria-labelledby="k-filters-title"
        onClose={() => setDialogOpen(false)} onClick={event => { if (event.target === dialog.current) dialog.current?.close(); }}>
        {dialogOpen && (
          <div className="k-filters-sheet">
            <header className="k-filters-head">
              <h2 id="k-filters-title">Filtres</h2>
              <button type="button" className="k-req-close" aria-label="Fermer" onClick={() => dialog.current?.close()}>×</button>
            </header>
            <div className="k-filters-body">
              <FilterFields value={draft} counts={draftCounts} onChange={patch => setDraft(current => ({ ...current, ...patch }))}
                toolOptions={toolOptionsFor(draftCounts)} creatorOptions={creatorOptionsFor(draftCounts)} />
            </div>
            <footer className="k-filters-foot">
              <button type="button" className="k-link-btn" onClick={() => setDraft(current => ({ ...DEFAULT_FILTERS, query: current.query, sort: current.sort, family: current.family, category: current.category }))}>Tout effacer</button>
              <button type="button" className="k-btn k-btn-primary" disabled={draftTotal === 0} onClick={applyFilters}>
                {draftTotal === 0 ? 'Aucun code' : `Afficher ${draftTotal} ${draftTotal > 1 ? 'codes' : 'code'}`}
              </button>
            </footer>
          </div>
        )}
      </dialog>

      <div className="k-board-results">
      {browsing && rows.length > 0 && (
        <div className="k-rows">
          {rows.map(row => (
            <section className="k-row" key={row.key} aria-labelledby={`k-row-${row.key}`}>
              <div className="k-row-head">
                <h2 id={`k-row-${row.key}`}>{row.title}</h2>
                <button type="button" className="k-row-all" onClick={() => seeRow(row.patch)} aria-label={`Tout voir : ${row.title}, ${row.total} codes`}>
                  Tout voir <span>{row.total}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                </button>
              </div>
              <ChipRow label={row.title} className="is-codes" paged>
                {row.codes.map(code => (
                  <div className="k-row-item" key={code.id}>
                    <BoardingCoupon code={code} link={code.creatorLink || toolBySlug.get(code.toolSlug)?.website || '#'} light votes />
                  </div>
                ))}
              </ChipRow>
            </section>
          ))}
        </div>
      )}
      <div className="k-board-bar">
        <p role="status">{browsing && rows.length > 0 && <span className="k-board-bar-title">Tous les codes · </span>}<strong>{results.length}</strong> {results.length > 1 ? 'codes trouvés' : 'code trouvé'}</p>
        <div className="k-board-tools">
          <div className="k-board-views" role="group" aria-label="Affichage des codes">
            <button type="button" aria-pressed={view === 'list'} onClick={() => switchView('list')} title="Liste : un code par ligne, l'essentiel">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="6.5" rx="2" /><rect x="3" y="13.5" width="18" height="6.5" rx="2" /><path d="M15 4v6.5M15 13.5V20" strokeDasharray="1.5 2" /></svg>
              Liste
            </button>
            <button type="button" aria-pressed={view === 'cards'} onClick={() => switchView('cards')} title="Cartes : toutes les infos, trois par ligne">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="7.5" height="18" rx="2" /><rect x="13.5" y="3" width="7.5" height="18" rx="2" /><path d="M3 15h7.5M13.5 15H21" strokeDasharray="1.5 2" /></svg>
              Cartes
            </button>
          </div>
        </div>
      </div>

      {lastChance.length > 0 && filters.deadline !== 'soon' && (
        <section className="k-board-last" aria-label="Dernière chance">
          <div className="k-board-last-head">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2M9 2h6" /></svg>
            <p><strong>Dernière chance</strong><span>{lastChance.length} {lastChance.length > 1 ? 'codes expirent' : 'code expire'} sous 7 jours</span></p>
            <button type="button" className="k-link" onClick={() => { update({ deadline: 'soon' }); toFilters(); }}>Tout voir</button>
          </div>
          <ul>
            {lastChance.slice(0, 4).map(({ code, daysLeft }) => (
              <li key={code.id}>
                <button type="button" className="k-board-last-ticket" onClick={() => { update({ deadline: 'soon', tool: code.toolSlug }); toFilters(); }}
                  aria-label={`${code.tool}, ${code.discount}, ${daysLeft === 0 ? 'expire aujourd’hui' : `expire dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''}`}`}>
                  <ToolLogo tool={code.toolSlug} name={code.tool} />
                  <span className="k-board-last-text"><strong>{code.tool}</strong><small>{code.discount}</small></span>
                  <span className="k-board-last-days">{daysLeft === 0 ? 'Auj.' : `J-${daysLeft}`}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {pills.length > 0 && (
        <ul className="k-board-pills" aria-label="Filtres choisis">
          {pills.map(pill => (
            <li key={pill.key}>
              <button type="button" className="k-board-pill" onClick={() => remove(pill.patch)} aria-label={`Retirer le filtre ${pill.label}`}>
                {pill.label}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
              </button>
            </li>
          ))}
          {pills.length > 1 && <li><button type="button" className="k-link k-board-clear" onClick={reset}>Tout effacer</button></li>}
        </ul>
      )}

      {results.length === 0 ? (
        <div className="k-board-empty k-board-item">
          <div className="k-board-empty-main k-paper">
            <span className="k-board-empty-tag">Coupon vierge</span>
            <h2>Aucun code ne correspond.</h2>
            {relax.length > 0 ? (
              <div className="k-board-relax">
                <p>Retire un filtre pour en retrouver&nbsp;:</p>
                <ul>
                  {relax.map(pill => (
                    <li key={pill.key}>
                      <button type="button" onClick={() => remove(pill.patch)}>
                        Sans {pill.label} <span>{pill.count} {pill.count > 1 ? 'codes' : 'code'}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p>Essaie un autre outil ou une autre catégorie.</p>
            )}
            <dl className="k-board-empty-lines" aria-hidden="true">
              <div><dt>Outil</dt><dd /></div>
              <div><dt>Code</dt><dd /></div>
              <div><dt>Vu chez</dt><dd /></div>
            </dl>
          </div>
          <Link className="k-board-empty-stub" href={routes.submit(shown.tool || undefined)}>
            <small>Tu as vu passer un code&nbsp;?</small>
            <strong>Propose-le</strong>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </Link>
        </div>
      ) : (
        <ul className={`k-board-list${view === 'list' ? ' k-pass-rows' : ''}`}>
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

type FieldsProps = {
  value: CodeFilters; counts: FacetCounts; onChange: (patch: Partial<CodeFilters>) => void;
  toolOptions: SelectOption[]; creatorOptions: SelectOption[];
};

/** Les filtres de la fenêtre « Filtres », chacun avec le nombre de codes qu'il donnerait. */
function FilterFields({ value, counts, onChange, toolOptions, creatorOptions }: FieldsProps) {
  const toggleTrust = (trust: TrustFilter) => onChange({
    trust: value.trust.includes(trust) ? value.trust.filter(t => t !== trust) : [...value.trust, trust],
  });
  return (
    <>
      <div className="k-board-group">
        <h3>Statut</h3>
        <div className="k-board-checks" role="radiogroup" aria-label="Statut">
          {STATUSES.map(status => (
            <button type="button" role="radio" key={status.value} className="k-board-check is-radio" aria-checked={value.status === status.value}
              onClick={() => onChange({ status: status.value })}>
              <span className="k-board-box" aria-hidden="true" />
              <span>{status.label}</span>
              {status.value !== 'all' && (
                <span className={`k-codeseal is-${status.value}`} aria-hidden="true"><TrustGlyph seal={status.value} /></span>
              )}
              <span className="k-board-count">{counts.status[status.value]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="k-filters-pair">
        <div className="k-board-group">
          <h3>Outil</h3>
          <AdminSelect id="k-board-tool" classPrefix="k-combo" ariaLabel="Outil" value={value.tool} onChange={tool => onChange({ tool })}
            options={toolOptions} searchPlaceholder="Chercher un outil…" />
        </div>
        <div className="k-board-group">
          <h3>Créateur</h3>
          <AdminSelect id="k-board-creator" classPrefix="k-combo" ariaLabel="Créateur" value={value.creator} onChange={creator => onChange({ creator })}
            options={creatorOptions} searchPlaceholder="Chercher un créateur…" />
        </div>
      </div>

      <div className="k-board-group">
        <h3>Confiance</h3>
        <div className="k-board-checks">
          {TRUSTS.map(trust => {
            const on = value.trust.includes(trust.value);
            return (
              <button type="button" key={trust.value} className="k-board-check" aria-pressed={on}
                disabled={!on && counts.trust[trust.value] === 0} onClick={() => toggleTrust(trust.value)}>
                <span className="k-board-box" aria-hidden="true" />
                <span>{trust.label}</span>
                <span className="k-board-count">{counts.trust[trust.value]}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="k-board-group">
        <h3>Type d&apos;offre</h3>
        <div className="k-board-chips">
          {OFFERS.map(offer => {
            const on = value.offer === offer.value;
            return (
              <button type="button" key={offer.value} className="k-board-chip" aria-pressed={on}
                disabled={!on && counts.offer[offer.value] === 0} onClick={() => onChange({ offer: on ? '' : offer.value })}>
                {offer.label} <span className="k-board-count">{counts.offer[offer.value]}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="k-board-group">
        <h3>Échéance</h3>
        <div className="k-board-chips">
          {DEADLINES.map(deadline => {
            const on = value.deadline === deadline.value;
            return (
              <button type="button" key={deadline.value} className="k-board-chip" aria-pressed={on}
                disabled={!on && counts.deadline[deadline.value] === 0} onClick={() => onChange({ deadline: on ? '' : deadline.value })}>
                {deadline.label} <span className="k-board-count">{counts.deadline[deadline.value]}</span>
              </button>
            );
          })}
        </div>
      </div>

      <button type="button" role="switch" className="k-board-switch" aria-checked={value.fresh}
        disabled={!value.fresh && counts.fresh === 0} onClick={() => onChange({ fresh: !value.fresh })}>
        <span className="k-board-knob" aria-hidden="true" />
        <span>Ajoutés cette semaine</span>
        <span className="k-board-count">{counts.fresh}</span>
      </button>
    </>
  );
}
