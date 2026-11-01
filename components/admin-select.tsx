'use client';
// Liste déroulante du back-office avec un petit champ de recherche en tête,
// pour retrouver vite une catégorie ou un outil quand la liste devient longue.
// Clavier : flèches pour se déplacer, Entrée pour choisir, Échap pour fermer.
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { filterOptions, moveActive, type SelectOption } from '@/lib/admin-select';

export type { SelectOption };

type Position = { left: number; width: number; top?: number; bottom?: number; maxHeight: number };

const GAP = 6;
const IDEAL_HEIGHT = 320;

export function AdminSelect({ id, value, onChange, options, placeholder = 'Choisir…', searchPlaceholder = 'Rechercher…', required, variant = 'field', ariaLabel }: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  required?: boolean;
  /** « field » dans un formulaire, « filter » dans une barre de filtres. */
  variant?: 'field' | 'filter';
  ariaLabel?: string;
}) {
  const listId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(-1);
  const [position, setPosition] = useState<Position | null>(null);

  const visible = useMemo(() => filterOptions(options, query), [options, query]);
  const selected = options.find(option => option.value === value);

  const place = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const below = window.innerHeight - rect.bottom - GAP * 2;
    const above = rect.top - GAP * 2;
    const width = Math.max(rect.width, 240);
    const left = Math.min(rect.left, window.innerWidth - width - GAP);
    if (below >= Math.min(IDEAL_HEIGHT, 200) || below >= above) setPosition({ left, width, top: rect.bottom + GAP, maxHeight: Math.min(IDEAL_HEIGHT, below) });
    else setPosition({ left, width, bottom: window.innerHeight - rect.top + GAP, maxHeight: Math.min(IDEAL_HEIGHT, above) });
  }, []);

  function openList() {
    setQuery('');
    setActive(Math.max(0, options.findIndex(option => option.value === value)));
    place();
    setOpen(true);
  }

  function close(focusTrigger = true) {
    setOpen(false);
    if (focusTrigger) triggerRef.current?.focus();
  }

  function choose(option: SelectOption) {
    onChange(option.value);
    close();
  }

  useLayoutEffect(() => { if (open) searchRef.current?.focus(); }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!popupRef.current?.contains(target) && !triggerRef.current?.contains(target)) close(false);
    };
    window.addEventListener('pointerdown', onPointer, true);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('pointerdown', onPointer, true);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, place]);

  useEffect(() => {
    if (!open || active < 0) return;
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  function onSearchKey(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setActive(index => moveActive(index, event.key === 'ArrowDown' ? 1 : -1, visible.length));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const option = visible[active];
      if (option) choose(option);
    } else if (event.key === 'Escape') {
      // Ne pas fermer la fenêtre de formulaire autour, seulement la liste.
      event.preventDefault();
      event.stopPropagation();
      close();
    } else if (event.key === 'Tab') {
      close(false);
    }
  }

  function onTriggerKey(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); openList(); }
  }

  const activeId = active >= 0 && visible[active] ? `${listId}-${active}` : undefined;

  return (
    <div className={`adm-combo adm-combo-${variant}`}>
      <button
        ref={triggerRef} id={id} type="button" className="adm-combo-trigger"
        aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? listId : undefined} aria-label={ariaLabel}
        onClick={() => (open ? close() : openList())} onKeyDown={onTriggerKey}
      >
        <span className={selected ? 'adm-combo-value' : 'adm-combo-value adm-combo-placeholder'}>
          {selected ? selected.label : placeholder}
          {selected?.hint && <span className="adm-combo-hint"> · {selected.hint}</span>}
        </span>
        <svg className="adm-combo-chevron" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      {required && (
        // Garde la validation native du formulaire (« Veuillez sélectionner… ») sans liste native visible.
        <input className="adm-combo-native" tabIndex={-1} aria-hidden="true" required value={value} onChange={() => {}} onFocus={() => triggerRef.current?.focus()} />
      )}
      {open && position && (
        <div ref={popupRef} className="adm-combo-pop" style={{ left: position.left, width: position.width, top: position.top, bottom: position.bottom, maxHeight: position.maxHeight }}>
          <div className="adm-combo-search">
            <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" /><path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            <input
              ref={searchRef} type="text" role="combobox" autoComplete="off" spellCheck={false}
              aria-label={searchPlaceholder} aria-expanded="true" aria-controls={listId} aria-activedescendant={activeId} aria-autocomplete="list"
              placeholder={searchPlaceholder} value={query}
              onChange={event => { setQuery(event.target.value); setActive(0); }} onKeyDown={onSearchKey}
            />
          </div>
          <ul ref={listRef} id={listId} role="listbox" className="adm-combo-list" aria-label={ariaLabel}>
            {query.trim() && !visible.some(option => !option.pinned) && <li className="adm-combo-empty" role="presentation">Aucun résultat pour « {query.trim()} »</li>}
            {visible.map((option, index) => (
              <li
                key={option.value} id={`${listId}-${index}`} data-index={index} role="option" aria-selected={option.value === value}
                className={`adm-combo-option${index === active ? ' is-active' : ''}${option.pinned ? ' is-pinned' : ''}`}
                onPointerMove={() => setActive(index)} onPointerDown={event => event.preventDefault()} onClick={() => choose(option)}
              >
                <span>{option.label}</span>
                {option.hint && <span className="adm-combo-hint">{option.hint}</span>}
                {option.value === value && <svg className="adm-combo-check" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="m5 12 5 5 9-10" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
