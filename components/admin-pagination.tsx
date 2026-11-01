'use client';
// Pagination des listes du back-office : page courante, retour à la page 1 quand
// la recherche ou les filtres changent, et remontée douce en haut de la liste.
import { useEffect, useRef, useState } from 'react';
import { pageNumbers, paginate, type Page } from '@/lib/admin-pagination';

export function usePagination<T>(items: T[], resetKey: string) {
  const [page, setPage] = useState(1);
  const topRef = useRef<HTMLDivElement>(null);
  useEffect(() => { setPage(1); }, [resetKey]);
  const current = paginate(items, page);
  function goTo(next: number) {
    setPage(next);
    const top = topRef.current;
    if (!top) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (top.getBoundingClientRect().top < 0) top.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }
  return { current, goTo, topRef };
}

export function Pagination<T>({ current, onChange, label }: { current: Page<T>; onChange: (page: number) => void; label: string }) {
  if (current.total === 0) return null;
  const { page, pageCount, from, to, total } = current;
  return (
    <nav className="adm-pager" aria-label={`Pagination des ${label}`}>
      <span className="adm-pager-range">{from}–{to} sur {total}</span>
      {pageCount > 1 && (
        <div className="adm-pager-pages">
          <button type="button" className="adm-pager-btn" onClick={() => onChange(page - 1)} disabled={page === 1} aria-label="Page précédente">‹</button>
          {pageNumbers(page, pageCount).map((item, index) => item === 'gap'
            ? <span key={`gap-${index}`} className="adm-pager-gap" aria-hidden="true">…</span>
            : <button key={item} type="button" className="adm-pager-btn" aria-current={item === page ? 'page' : undefined} aria-label={`Page ${item}`} onClick={() => onChange(item)}>{item}</button>)}
          <button type="button" className="adm-pager-btn" onClick={() => onChange(page + 1)} disabled={page === pageCount} aria-label="Page suivante">›</button>
        </div>
      )}
    </nav>
  );
}
