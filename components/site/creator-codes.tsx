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
  const toolOf = useMemo(() => new Map(tools.map(tool => [tool.slug, tool])), [tools]);
  const shown = codes.filter(code => matchesSearch([code.tool, code.code, code.discount, code.sourceTitle, toolOf.get(code.toolSlug)?.category], query));

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
          <p role="status">{query ? <><strong>{shown.length}</strong> sur {codes.length}</> : <><strong>{codes.length}</strong> {codes.length > 1 ? 'codes' : 'code'}</>}</p>
          <div className="k-creator-views">
            <CodeViewToggles cards={cards} onCards={chooseCards} />
          </div>
      </div>
      {shown.length === 0
        ? <p className="k-creator-codes-empty">Aucun code de {creator} ne correspond à « {query} ». <button type="button" className="k-link-btn" onClick={() => setQuery('')}>Effacer la recherche</button></p>
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
