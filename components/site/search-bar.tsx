'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { searchTools } from '@/lib/data';
import { routes } from '@/lib/routes';
import { plural } from '@/lib/ui';

// Barre de recherche façon « palette de commandes » : autocomplétion au clavier (flèches, Entrée, Échap),
// raccourci « / » pour la rejoindre depuis n'importe où sur la page.
export function SearchBar({ placeholder = 'Hostinger, NordVPN, ElevenLabs…', autoFocusShortcut = true, initial = '' }: { placeholder?: string; autoFocusShortcut?: boolean; initial?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState(initial);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const suggestions = query.trim().length >= 1 ? searchTools(query).slice(0, 6) : [];
  const showList = open && query.trim().length >= 1;

  useEffect(() => {
    if (!autoFocusShortcut) return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (event.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) && !target.isContentEditable) {
        event.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [autoFocusShortcut]);

  function go(index: number) {
    const tool = suggestions[index];
    if (tool) router.push(routes.tool(tool.slug));
    else if (query.trim()) router.push(routes.search(query.trim()));
    setOpen(false);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') { event.preventDefault(); setOpen(true); setActive(i => Math.min(i + 1, suggestions.length - 1)); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setActive(i => Math.max(i - 1, 0)); }
    else if (event.key === 'Escape') { setOpen(false); }
  }

  return (
    <div className="k-search">
      <form className="k-search-box" role="search" onSubmit={event => { event.preventDefault(); go(active); }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <label htmlFor={`${listId}-input`} className="k-sr">Nom de l&apos;outil</label>
        <input
          ref={input}
          id={`${listId}-input`}
          type="search"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && suggestions[active] ? `${listId}-${active}` : undefined}
          autoComplete="off"
          spellCheck={false}
          value={query}
          placeholder={placeholder}
          onChange={event => { setQuery(event.target.value); setOpen(true); setActive(0); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKeyDown}
        />
        {autoFocusShortcut && !query && <kbd className="k-kbd" aria-hidden="true">/</kbd>}
        <button className="k-btn k-btn-primary" type="submit">Trouver le code</button>
      </form>
      {showList && (
        <ul className="k-suggest" id={listId} role="listbox" aria-label="Outils suggérés">
          {suggestions.length === 0 && <li className="k-suggest-empty" role="option" aria-selected="false" aria-disabled="true">Pas encore suivi. Entrée pour chercher « {query.trim()} ».</li>}
          {suggestions.map((tool, index) => (
            <li
              key={tool.slug}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === active}
              onMouseEnter={() => setActive(index)}
              onMouseDown={event => { event.preventDefault(); go(index); }}
            >
              <span className="k-tool-logo" aria-hidden="true">{tool.name.slice(0, 1).toUpperCase()}</span>
              <span><strong>{tool.name}</strong><span>{tool.category}</span></span>
              <em>{plural(tool.codes, 'code', 'codes')}</em>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
