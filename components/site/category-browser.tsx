'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { Code, Tool } from '@/lib/data';
import type { CodeSort, CodeStatusFilter } from '@/lib/codes-board';
import { browseCategory, categoryParams, type CategoryFilters, DEFAULT_CATEGORY_FILTERS, hasCategoryFilter } from '@/lib/category-browse';
import { routes } from '@/lib/routes';
import { plural } from '@/lib/ui';
import { MiniCoupon } from './coupon';
import { ToolSeal } from './tool-logo';
import { ToolCard } from './tool-card';
import { CodeBadge } from './code-badge';

// Page d'une catégorie : une barre pour affiner (recherche, statut, outil, tri) au-dessus des codes et des outils.
// Les codes s'affichent par lots de 6 (« Voir plus de codes »). Les filtres sont recopiés dans l'adresse
// pour partager une recherche, sans recharger la page.

const PAGE = 6;
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

type Props = { codes: Code[]; tools: Tool[]; initial: CategoryFilters; now: number };

export function CategoryBrowser({ codes, tools, initial, now }: Props) {
  const [filters, setFilters] = useState<CategoryFilters>(initial);
  const [limit, setLimit] = useState(PAGE);
  const view = useMemo(() => browseCategory(codes, tools, filters, now), [codes, tools, filters, now]);
  const update = (patch: Partial<CategoryFilters>) => { setFilters(current => ({ ...current, ...patch })); setLimit(PAGE); };

  // L'adresse suit les filtres (remplacée, pas ajoutée à l'historique).
  useEffect(() => {
    const query = categoryParams(filters).toString();
    const url = `${window.location.pathname}${query ? `?${query}` : ''}`;
    if (url !== `${window.location.pathname}${window.location.search}`) window.history.replaceState(window.history.state, '', url);
  }, [filters]);

  const filtered = hasCategoryFilter(filters);
  // Pastilles d'outils : le plus de codes d'abord (sans tenir compte des filtres, pour qu'elles ne bougent pas).
  const toolChips = useMemo(() => {
    const total = new Map<string, number>();
    for (const code of codes) total.set(code.toolSlug, (total.get(code.toolSlug) ?? 0) + 1);
    return [...tools].sort((a, b) => (total.get(b.slug) ?? 0) - (total.get(a.slug) ?? 0) || a.name.localeCompare(b.name, 'fr'));
  }, [codes, tools]);
  const visible = view.codes.slice(0, limit);

  return (
    <>
      <div className="k-cat-bar" role="search" aria-label="Affiner les résultats">
        <div className="k-cat-row">
          <label className="k-board-search k-cat-search">
            <span className="k-sr">Chercher un outil, un créateur ou un code</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <input type="search" value={filters.query} onChange={event => update({ query: event.target.value })} placeholder="Outil, créateur, code…" maxLength={80} />
          </label>
          <label className="k-cat-sort">
            <span className="k-sr">Trier par</span>
            <select className="k-board-select" value={filters.sort} onChange={event => update({ sort: event.target.value as CodeSort })}>
              {SORTS.map(sort => <option key={sort.value} value={sort.value}>{sort.label}</option>)}
            </select>
          </label>
        </div>
        <div className="k-cat-chips" role="group" aria-label="Statut">
          <span>Statut</span>
          {STATUSES.map(status => (
            <button type="button" key={status.value} className="k-chip" aria-pressed={filters.status === status.value} onClick={() => update({ status: status.value })}>
              {status.label} <small>{view.counts.status[status.value]}</small>
            </button>
          ))}
        </div>
        {tools.length > 1 && (
          <div className="k-cat-chips" role="group" aria-label="Outil">
            <span>Outil</span>
            <button type="button" className="k-chip" aria-pressed={!filters.tool} onClick={() => update({ tool: '' })}>Tous</button>
            {toolChips.map(tool => (
              <button type="button" key={tool.slug} className="k-chip" aria-pressed={filters.tool === tool.slug}
                onClick={() => update({ tool: filters.tool === tool.slug ? '' : tool.slug })}>
                {tool.name} <small>{view.counts.tool[tool.slug] ?? 0}</small>
              </button>
            ))}
          </div>
        )}
        <p className="k-cat-count" aria-live="polite">
          {plural(view.codes.length, 'code', 'codes')} · {plural(view.tools.length, 'outil', 'outils')}
          {filtered && <button type="button" className="k-cat-reset" onClick={() => update(DEFAULT_CATEGORY_FILTERS)}>Tout afficher</button>}
        </p>
      </div>

      {view.codes.length === 0 && view.tools.length === 0 ? (
        <div className="k-empty">
          <h2>Rien ne correspond.</h2>
          <p>Essaie un autre mot ou retire un filtre.</p>
          <button type="button" className="k-btn k-btn-ghost" onClick={() => update(DEFAULT_CATEGORY_FILTERS)}>Tout afficher</button>
        </div>
      ) : (
        <>
          {visible.length > 0 && (
            <div className="k-coupon-grid">
              {visible.map(code => {
                const tool = tools.find(item => item.slug === code.toolSlug);
                return (
                  <div className="k-coupon-card" key={code.id}>
                    <MiniCoupon
                      codeId={code.id}
                      code={code.code}
                      link={code.creatorLink || tool?.website || '#'}
                      avatar={<ToolSeal tool={tool?.slug ?? code.tool} name={code.tool} />}
                      title={<>{code.tool} · {code.discount}</>}
                      subtitle={<>de {code.creator}</>}
                    />
                    <div className="k-coupon-meta">
                      <CodeBadge code={code} dark withDate={false} />
                      {tool && <Link href={routes.tool(tool.slug)}>Voir la fiche →</Link>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {view.codes.length > limit && (
            <div className="k-cat-more">
              <button type="button" className="k-btn k-btn-ghost" onClick={() => setLimit(current => current + PAGE)}>
                Voir plus de codes <small>({view.codes.length - limit})</small>
              </button>
            </div>
          )}
          {view.tools.length > 0 && (
            <>
              <h2 className="k-cat-title">Les outils</h2>
              <div className="k-tool-grid">{view.tools.map(tool => <ToolCard tool={tool} key={tool.slug} />)}</div>
            </>
          )}
        </>
      )}
    </>
  );
}
