'use client';
// Codes d'un créateur sur sa page : recherche, et deux vues comme sur « Tous les codes ».
// « Liste » : le coupon couché, un par ligne. « Cartes » : le coupon debout compact (mêmes infos que la liste),
// quatre par ligne. Le choix de vue est partagé avec la page des codes (même préférence de ce navigateur).
import { useEffect, useMemo, useState } from 'react';
import type { Code, Tool } from '@/lib/data';
import { matchesSearch } from '@/lib/admin-search';
import { BoardingCoupon } from '@/components/site/boarding-coupon';

type View = 'list' | 'cards';
const VIEW_KEY = 'koupi-codes-view';
/** En dessous, la recherche n'apporte rien. */
const SEARCH_FROM = 4;

/** Codes couchés, un par ligne : le même coupon que la vue « Liste » de la page Codes. */
export function CodeRows({ codes, tools, reveal }: { codes: Code[]; tools: Tool[]; reveal: boolean }) {
  const toolOf = new Map(tools.map(tool => [tool.slug, tool]));
  return (
    <ul className="k-pass-rows">
      {codes.map(code => {
        const tool = toolOf.get(code.toolSlug);
        return (
          // Dans un bloc replié, pas d'animation d'apparition : elle se joue avant qu'on ouvre le bloc.
          <li key={code.id} data-reveal={reveal || undefined}>
            <BoardingCoupon code={code} category={tool?.category} link={code.creatorLink || tool?.website || '#'} />
          </li>
        );
      })}
    </ul>
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
            <button type="button" aria-pressed={view === 'list'} onClick={() => choose('list')} title="Liste : un code par ligne, l'essentiel">
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
          : <CodeRows codes={shown} tools={tools} reveal />}
    </section>
  );
}
