'use client';
// Recherche globale du back-office : ⌘K (Mac) ou Ctrl+K, ou le bouton de la barre du haut.
// S'ouvre vide ; les résultats apparaissent dès qu'on tape. Flèches pour choisir, Entrée pour ouvrir, Échap pour fermer.
// L'index est rechargé à chaque ouverture.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { afterDialogClose } from '@/lib/admin-dialog';
import { ADMIN_PAGES, COMMAND_KIND_LABELS, highlightParts, searchCommands, type CommandItem, type CommandKind } from '@/lib/admin-command';

const kindIcon: Record<CommandKind, React.ReactNode> = {
  page: <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5" />,
  code: <path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4zM10 6v12" />,
  tool: <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.5-.5-.5-2.5z" />,
  creator: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  proposal: <><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.5 5h13L22 12v7H2v-7z" /></>,
};
const searchIcon = (size: number) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>;

export function CommandPalette() {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState<CommandItem[]>(ADMIN_PAGES);
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [active, setActive] = useState(0);
  const [mac, setMac] = useState(false);

  const show = useCallback(() => {
    setQuery(''); setActive(0); setOpen(true);
    if (!dialog.current?.open) dialog.current?.showModal();
    setState('loading');
    fetch('/api/admin/search-index').then(async response => {
      if (!response.ok) throw new Error();
      setIndex((await response.json() as { items: CommandItem[] }).items); setState('idle');
    }).catch(() => setState('error'));
  }, []);

  useEffect(() => {
    setMac(/Mac|iPhone|iPad/.test(navigator.platform));
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); if (dialog.current?.open) dialog.current.close(); else show(); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [show]);

  const groups = useMemo(() => searchCommands(index, query), [index, query]);
  const flat = groups.flatMap(group => group.items);
  useEffect(() => { setActive(0); }, [query]);
  useEffect(() => { document.getElementById(`cmd-${active}`)?.scrollIntoView({ block: 'nearest' }); }, [active]);

  function go(item: CommandItem | undefined) {
    if (!item) return;
    dialog.current?.close();
    // Les exports sont des fichiers : on les télécharge sans quitter la page.
    if (item.href.startsWith('/api/')) { window.location.href = item.href; return; }
    // Même page avec un autre filtre : on recharge pour que la liste lise le nouveau ?q=.
    if (item.href.split('?')[0] === window.location.pathname) window.location.assign(item.href);
    else router.push(item.href);
  }
  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'ArrowDown') { event.preventDefault(); setActive(i => Math.min(flat.length - 1, i + 1)); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setActive(i => Math.max(0, i - 1)); }
    else if (event.key === 'Enter') { event.preventDefault(); go(flat[active]); }
    else if (event.key === 'Escape') { event.preventDefault(); dialog.current?.close(); }
  }

  const typed = query.trim().length > 0;
  let position = -1;
  return (
    <>
      <button type="button" className="adm-cmd-trigger" onClick={show} aria-keyshortcuts={mac ? 'Meta+K' : 'Control+K'}>
        {searchIcon(16)}
        <span className="adm-cmd-trigger-text">Rechercher</span>
        <kbd suppressHydrationWarning>{mac ? '⌘' : 'Ctrl'} K</kbd>
      </button>
      <dialog ref={dialog} className="adm-dialog adm-cmd" aria-label="Recherche globale" onClose={() => afterDialogClose(() => { if (!dialog.current?.open) setOpen(false); })}
        onClick={event => { if (event.target === dialog.current) dialog.current?.close(); }}>
        {open && (
          <div className="adm-cmd-body" data-typed={typed ? '' : undefined}>
            <div className="adm-cmd-field">
              {searchIcon(18)}
              <input ref={input} autoFocus type="text" value={query} onChange={event => setQuery(event.target.value)} onKeyDown={onKeyDown}
                placeholder="Rechercher un code, un outil, un créateur…" aria-label="Rechercher dans le back-office" role="combobox" aria-expanded={typed}
                aria-controls="cmd-results" aria-activedescendant={flat.length ? `cmd-${active}` : undefined} aria-autocomplete="list" spellCheck={false} autoComplete="off" />
              {state === 'loading' && <span className="adm-cmd-spinner" aria-hidden="true" />}
              <button type="button" className="adm-cmd-esc" onClick={() => dialog.current?.close()} aria-label="Fermer la recherche">Échap</button>
            </div>
            <div className="adm-cmd-panel">
              <div className="adm-cmd-results" id="cmd-results" role="listbox" aria-label="Résultats">
                {groups.map(group => (
                  <div key={group.kind} role="group" aria-label={COMMAND_KIND_LABELS[group.kind]} className="adm-cmd-section">
                    <div className="adm-cmd-group" aria-hidden="true">{COMMAND_KIND_LABELS[group.kind]}</div>
                    {group.items.map(item => {
                      position += 1;
                      const i = position;
                      return (
                        <div key={`${item.kind}-${item.href}-${i}`} id={`cmd-${i}`} role="option" aria-selected={i === active} className="adm-cmd-item"
                          onMouseMove={() => setActive(i)} onClick={() => go(item)}>
                          <span className="adm-cmd-icon" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{kindIcon[item.kind]}</svg></span>
                          <span className="adm-cmd-text">
                            <b className={item.kind === 'code' || item.kind === 'proposal' ? 'mono' : undefined}>
                              {highlightParts(item.label, query).map((part, n) => part.match ? <mark key={n}>{part.text}</mark> : part.text)}
                            </b>
                            <span>{item.detail}</span>
                          </span>
                          <kbd className="adm-cmd-enter" aria-hidden="true">↵</kbd>
                        </div>
                      );
                    })}
                  </div>
                ))}
                {typed && flat.length === 0 && (
                  <div className="adm-cmd-empty">
                    {state === 'loading' ? 'Chargement…' : <><b>Aucun résultat</b><span>Rien ne correspond à « {query.trim()} ». Essaie un autre mot.</span></>}
                  </div>
                )}
              </div>
            </div>
            <div className="adm-cmd-foot" role="status">
              {state === 'error'
                ? <span>Les codes et outils n’ont pas pu être chargés : seules les pages sont proposées.</span>
                : typed
                  ? <><span><kbd>↑</kbd><kbd>↓</kbd> choisir</span><span><kbd>↵</kbd> ouvrir</span><span><kbd>Échap</kbd> fermer</span></>
                  : <span>Codes, outils, créateurs, propositions et pages de l’admin</span>}
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
