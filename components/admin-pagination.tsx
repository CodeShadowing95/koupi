'use client';
// Pagination des listes du back-office : page courante, taille de page mémorisée, retour à la page 1
// quand la recherche ou les filtres changent, et remontée douce en haut de la liste.
import { useEffect, useRef, useState } from 'react';
import { ADMIN_PAGE_SIZE, ADMIN_PAGE_SIZE_KEY, ADMIN_PAGE_SIZES, pageNumbers, paginate, parsePageSize, type Page } from '@/lib/admin-pagination';

export function usePagination<T>(items: T[], resetKey: string) {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(ADMIN_PAGE_SIZE);
  const topRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    try { setSize(parsePageSize(window.localStorage.getItem(ADMIN_PAGE_SIZE_KEY))); } catch { /* stockage indisponible */ }
  }, []);
  useEffect(() => { setPage(1); }, [resetKey]);
  const current = paginate(items, page, size);
  function goTo(next: number) {
    setPage(next);
    const top = topRef.current;
    if (!top) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (top.getBoundingClientRect().top < 0) top.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }
  function changeSize(next: number) {
    // On garde le premier élément affiché à l'écran : la nouvelle page est celle qui le contient.
    const first = (current.page - 1) * size;
    setSize(next);
    setPage(Math.floor(first / next) + 1);
    try { window.localStorage.setItem(ADMIN_PAGE_SIZE_KEY, String(next)); } catch { /* stockage indisponible */ }
  }
  return { current, goTo, topRef, size, changeSize };
}

const chevron = (d: string) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;

export function Pagination<T>({ current, onChange, label, size, onSizeChange }: { current: Page<T>; onChange: (page: number) => void; label: string; size?: number; onSizeChange?: (size: number) => void }) {
  if (current.total === 0) return null;
  const { page, pageCount, from, to, total } = current;
  const sizeId = `page-size-${label.replace(/\W+/g, '-')}`;
  return (
    <nav className="adm-pager" aria-label={`Pagination des ${label}`}>
      <div className="adm-pager-left">
        {onSizeChange && (
          <label className="adm-pager-size" htmlFor={sizeId}>Par page
            <select id={sizeId} value={size} onChange={event => onSizeChange(Number(event.target.value))}>
              {ADMIN_PAGE_SIZES.map(option => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
        )}
        <span className="adm-pager-range">{from}–{to} sur {total}</span>
      </div>
      {pageCount > 1 && (
        <div className="adm-pager-pages">
          <button type="button" className="adm-pager-btn" onClick={() => onChange(1)} disabled={page === 1} aria-label="Première page" title="Première page">{chevron('M6 5v14M17 6l-6 6 6 6')}</button>
          <button type="button" className="adm-pager-btn" onClick={() => onChange(page - 1)} disabled={page === 1} aria-label="Page précédente" title="Page précédente">{chevron('m15 6-6 6 6 6')}</button>
          {pageNumbers(page, pageCount).map((item, index) => item === 'gap'
            ? <span key={`gap-${index}`} className="adm-pager-gap" aria-hidden="true">…</span>
            : <button key={item} type="button" className="adm-pager-btn" aria-current={item === page ? 'page' : undefined} aria-label={`Page ${item}`} onClick={() => onChange(item)}>{item}</button>)}
          <button type="button" className="adm-pager-btn" onClick={() => onChange(page + 1)} disabled={page === pageCount} aria-label="Page suivante" title="Page suivante">{chevron('m9 6 6 6-6 6')}</button>
          <button type="button" className="adm-pager-btn" onClick={() => onChange(pageCount)} disabled={page === pageCount} aria-label="Dernière page" title="Dernière page">{chevron('m7 6 6 6-6 6M18 5v14')}</button>
        </div>
      )}
    </nav>
  );
}
