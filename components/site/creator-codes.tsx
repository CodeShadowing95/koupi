'use client';
// Codes d'un créateur sur sa page : recherche, et deux vues comme sur « Tous les codes ».
// « Liste » : le coupon couché habituel, deux par ligne. « Cartes » : le coupon debout compact (mêmes infos que la liste),
// quatre par ligne. Le choix de vue est partagé avec la page des codes (même préférence de ce navigateur).
import Link from '@/components/site/site-pages';
import { useEffect, useMemo, useState } from 'react';
import type { Code, Tool } from '@/lib/data';
import { routes } from '@/lib/routes';
import { matchesSearch } from '@/lib/admin-search';
import { MiniCoupon } from '@/components/site/coupon';
import { ToolSeal } from '@/components/site/tool-logo';
import { CodeBadge } from '@/components/site/code-badge';
import { BoardingCoupon } from '@/components/site/boarding-coupon';

type View = 'list' | 'cards';
const VIEW_KEY = 'koupi-codes-view';
/** En dessous, la recherche n'apporte rien. */
const SEARCH_FROM = 4;

export function CodeRow({ code, tool, reveal }: { code: Code; tool?: Tool; reveal: boolean }) {
  return (
    // Dans un bloc replié, pas d'animation d'apparition : elle se joue avant qu'on ouvre le bloc.
    <div className="k-coupon-card" data-reveal={reveal || undefined}>
      <MiniCoupon
        codeId={code.id}
        className="k-row-coupon"
        code={code.code}
        link={code.creatorLink || tool?.website || '#'}
        avatar={<ToolSeal tool={tool?.slug ?? code.tool} name={code.tool} />}
        title={<>{code.tool} · {code.discount}</>}
        subtitle={code.sourceTitle}
      />
      <div className="k-coupon-meta">
        <CodeBadge code={code} dark withDate={false} />
        <span className="k-coupon-meta-group is-links">
          <a href={code.source} target="_blank" rel="noopener noreferrer">Source ↗</a>
          {tool && <Link href={routes.tool(tool.slug)}>Fiche {tool.name} →</Link>}
        </span>
      </div>
    </div>
  );
}

export function CreatorCodes({ codes, tools, creator }: { codes: Code[]; tools: Tool[]; creator: string }) {
  const [view, setView] = useState<View>('list');
  const [query, setQuery] = useState('');
  useEffect(() => {
    try { if (window.localStorage.getItem(VIEW_KEY) === 'cards') setView('cards'); } catch { /* stockage indisponible */ }
  }, []);
  const choose = (next: View) => {
    setView(next);
    try { window.localStorage.setItem(VIEW_KEY, next); } catch { /* stockage indisponible */ }
  };
  const toolOf = useMemo(() => new Map(tools.map(tool => [tool.slug, tool])), [tools]);
  const shown = codes.filter(code => matchesSearch([code.tool, code.code, code.discount, code.sourceTitle, toolOf.get(code.toolSlug)?.category], query));

  return (
    <section className={`k-creator-codes is-${view}`} aria-label={`Codes de ${creator}`}>
      <div className="k-creator-codes-bar">
          {codes.length >= SEARCH_FROM && (
            <label className="k-creator-search">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
              <span className="k-sr">Chercher dans ses codes</span>
              <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Outil, code, réduction…" />
            </label>
          )}
          <p role="status">{query ? <><strong>{shown.length}</strong> sur {codes.length}</> : <><strong>{codes.length}</strong> {codes.length > 1 ? 'codes' : 'code'}</>}</p>
          <div className="k-board-views" role="group" aria-label="Affichage des codes">
            <button type="button" aria-pressed={view === 'list'} onClick={() => choose('list')} title="Liste : deux codes par ligne">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="6.5" rx="2" /><rect x="3" y="13.5" width="18" height="6.5" rx="2" /><path d="M15 4v6.5M15 13.5V20" strokeDasharray="1.5 2" /></svg>
              Liste
            </button>
            <button type="button" aria-pressed={view === 'cards'} onClick={() => choose('cards')} title="Cartes : l’essentiel, quatre par ligne">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="7.5" height="18" rx="2" /><rect x="13.5" y="3" width="7.5" height="18" rx="2" /><path d="M3 15h7.5M13.5 15H21" strokeDasharray="1.5 2" /></svg>
              Cartes
            </button>
          </div>
      </div>
      {shown.length === 0
        ? <p className="k-creator-codes-empty">Aucun code de {creator} ne correspond à « {query} ». <button type="button" className="k-link-btn" onClick={() => setQuery('')}>Effacer la recherche</button></p>
        : view === 'cards'
          ? (
            <ul className="k-creator-cards">
              {shown.map(code => {
                const tool = toolOf.get(code.toolSlug);
                return <li key={code.id}><BoardingCoupon compact code={code} category={tool?.category} link={code.creatorLink || tool?.website || '#'} /></li>;
              })}
            </ul>
          )
          : <div className="k-creator-rows">{shown.map(code => <CodeRow key={code.id} code={code} tool={toolOf.get(code.toolSlug)} reveal />)}</div>}
    </section>
  );
}
