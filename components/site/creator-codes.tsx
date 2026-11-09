'use client';
// Codes d'un créateur sur sa page : recherche, et la même grille que l'Explorer (cartes détaillées ou simples ;
// coupons de nuit quand le site est en thème sombre). Le choix d'affichage est partagé avec l'Explorer (même préférence de ce navigateur).
import { useMemo, useState } from 'react';
import type { Code, Tool } from '@/lib/data';
import { matchesSearch } from '@/lib/admin-search';
import { BoardingCoupon } from '@/components/site/boarding-coupon';
import { CodeViewToggles, codeGridClass, useCodeViews } from '@/components/site/code-view-toggles';
import type { CardView } from '@/lib/explore';

/** En dessous, la recherche n'apporte rien. */
const SEARCH_FROM = 4;

/** Grille de coupons comme dans l'Explorer. */
export function CodeGrid({ codes, tools, cards }: { codes: Code[]; tools: Tool[]; cards: CardView }) {
  const toolOf = new Map(tools.map(tool => [tool.slug, tool]));
  return (
    <ul className={codeGridClass(cards)}>
      {codes.map(code => {
        const tool = toolOf.get(code.toolSlug);
        return (
          <li key={code.id}>
            <BoardingCoupon code={code} category={tool?.category} link={code.creatorLink || tool?.website || '#'}
              light={cards === 'simple'} votes={cards === 'simple'} />
          </li>
        );
      })}
    </ul>
  );
}

/** Codes en cours et, repliés dessous, ceux dont la date de fin est passée : mêmes réglages d'affichage pour les deux. */
export function CreatorCodes({ codes, expired, tools, creator, expiredTitle }: { codes: Code[]; expired: Code[]; tools: Tool[]; creator: string; expiredTitle: string }) {
  const { cards, chooseCards } = useCodeViews();
  const [query, setQuery] = useState('');
  const [tool, setTool] = useState('');
  const toolOf = useMemo(() => new Map(tools.map(tool => [tool.slug, tool])), [tools]);
  // Ses outils, du plus fourni au moins fourni : une pastille par outil pour trier d'un geste, comme sur l'Explorer.
  const toolChips = useMemo(() => {
    const byTool = new Map<string, { slug: string; name: string; count: number }>();
    for (const code of codes) {
      const entry = byTool.get(code.toolSlug) ?? { slug: code.toolSlug, name: code.tool, count: 0 };
      entry.count += 1;
      byTool.set(code.toolSlug, entry);
    }
    return [...byTool.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'fr'));
  }, [codes]);
  const shown = codes.filter(code => (!tool || code.toolSlug === tool)
    && matchesSearch([code.tool, code.code, code.discount, code.sourceTitle, toolOf.get(code.toolSlug)?.category], query));

  return (
    <>
    {codes.length > 0 && <section className="k-creator-codes" aria-label={`Codes de ${creator}`}>
      <div className="k-creator-codes-bar">
          {codes.length >= SEARCH_FROM && (
            <label className="k-creator-search">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
              <span className="k-sr">Chercher dans ses codes</span>
              <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Outil, code, réduction…" />
            </label>
          )}
          <p role="status">{query || tool ? <><strong>{shown.length}</strong> sur {codes.length}</> : <><strong>{codes.length}</strong> {codes.length > 1 ? 'codes' : 'code'}</>}</p>
          <div className="k-creator-views">
            <CodeViewToggles cards={cards} onCards={chooseCards} />
          </div>
      </div>
      {toolChips.length > 1 && (
        <nav className="k-chan-chips" aria-label="Ses outils">
          <button type="button" className="k-ex-chip" aria-pressed={!tool} onClick={() => setTool('')}>Tous</button>
          {toolChips.map(chip => (
            <button key={chip.slug} type="button" className="k-ex-chip" aria-pressed={tool === chip.slug} onClick={() => setTool(current => (current === chip.slug ? '' : chip.slug))}>
              {chip.name}<small>{chip.count}</small>
            </button>
          ))}
        </nav>
      )}
      {shown.length === 0
        ? <p className="k-creator-codes-empty">Aucun code de {creator} ne correspond{query ? <> à « {query} »</> : null}. <button type="button" className="k-link-btn" onClick={() => { setQuery(''); setTool(''); }}>Tout afficher</button></p>
        : <CodeGrid codes={shown} tools={tools} cards={cards} />}
    </section>}
    {expired.length > 0 && (
      <details className="k-creator-expired">
        <summary>{expiredTitle}</summary>
        <p>Le créateur avait annoncé une date de fin. Ils marchent peut-être encore : essaie, et dis-nous si ça a marché.</p>
        <CodeGrid codes={expired} tools={tools} cards={cards} />
      </details>
    )}
    </>
  );
}
