'use client';
// Recherche globale du back-office : ⌘K (Mac) ou Ctrl+K, ou le bouton de la barre du haut.
// À l'ouverture : récents, accès rapide, pages et exports ; dès qu'on tape, les résultats. Flèches pour choisir, Entrée pour ouvrir, Échap pour fermer.
// L'index est rechargé à chaque ouverture.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { afterDialogClose } from '@/lib/admin-dialog';
import {
  ADMIN_PAGES, COMMAND_FILTERS, COMMAND_FILTER_LABELS, COMMAND_STATUS_LABELS, RECENT_STORAGE_KEY, countByKind, cycleFilter, highlightParts, parseRecent, pushRecent, searchCommands, suggestCommands,
  type CommandFilter, type CommandItem, type CommandKind, type CommandStatus,
} from '@/lib/admin-command';
import { StatusDot, type Tone } from '@/components/admin-card';

const statusTone: Record<CommandStatus, Tone> = { verified: 'ok', to_test: 'warn', pending: 'muted', rejected: 'bad', archived: 'muted' };

const kindIcon: Record<CommandKind, React.ReactNode> = {
  page: <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5" />,
  code: <path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4zM10 6v12" />,
  tool: <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.5-.5-.5-2.5z" />,
  creator: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  proposal: <><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.5 5h13L22 12v7H2v-7z" /></>,
};
const allIcon = <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>;
const icon = (path: React.ReactNode, size = 16) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{path}</svg>;
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
  const [filter, setFilter] = useState<CommandFilter>('all');
  const [mac, setMac] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);

  const show = useCallback(() => {
    setQuery(''); setActive(0); setFilter('all'); setOpen(true);
    try { setRecent(parseRecent(localStorage.getItem(RECENT_STORAGE_KEY))); } catch { setRecent([]); }
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

  const typed = query.trim().length > 0;
  const groups = useMemo(() => typed ? searchCommands(index, query, 5, filter) : suggestCommands(index, recent, filter), [index, query, filter, recent, typed]);
  const counts = useMemo(() => countByKind(index, query), [index, query]);
  const flat = groups.flatMap(group => group.items);
  useEffect(() => { setActive(0); }, [query, filter]);
  useEffect(() => { document.getElementById(`cmd-${active}`)?.scrollIntoView({ block: 'nearest' }); }, [active]);

  function go(item: CommandItem | undefined) {
    if (!item) return;
    dialog.current?.close();
    try { localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(pushRecent(recent, item.href))); } catch { /* navigation privée : pas de récents */ }
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
    else if (event.key === 'Tab') {
      event.preventDefault();
      // On saute les types sans élément.
      const step = event.shiftKey ? -1 : 1;
      setFilter(current => {
        let next = cycleFilter(current, step);
        while (next !== 'all' && counts[next] === 0) next = cycleFilter(next, step);
        return next;
      });
    }
  }

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
          <div className="adm-cmd-body" data-filled={typed || groups.length > 0 ? '' : undefined}>
            <div className="adm-cmd-field">
              {searchIcon(18)}
              <input ref={input} autoFocus type="text" value={query} onChange={event => setQuery(event.target.value)} onKeyDown={onKeyDown}
                placeholder="Commence à taper…" aria-label="Rechercher dans le back-office" role="combobox" aria-expanded={flat.length > 0}
                aria-controls="cmd-results" aria-activedescendant={flat.length ? `cmd-${active}` : undefined} aria-autocomplete="list" spellCheck={false} autoComplete="off" />
              {state === 'loading' && <span className="adm-cmd-spinner" aria-hidden="true" />}
              <kbd className="adm-cmd-kbd" suppressHydrationWarning>{mac ? '⌘' : 'Ctrl'} K</kbd>
            </div>
            <div className="adm-cmd-filters" role="tablist" aria-label="Filtrer par type">
              {COMMAND_FILTERS.map(item => (
                <button key={item} type="button" role="tab" aria-selected={filter === item} className="adm-cmd-chip" tabIndex={-1} data-empty={typed && counts[item] === 0 ? "" : undefined}
                  onClick={() => { setFilter(item); input.current?.focus(); }}>
                  {icon(item === 'all' ? allIcon : kindIcon[item], 14)}
                  <span>{COMMAND_FILTER_LABELS[item]}</span>
                  {typed && <span className="adm-cmd-chip-n">{counts[item]}</span>}
                </button>
              ))}
            </div>
            <div className="adm-cmd-panel">
              <div className="adm-cmd-results" id="cmd-results" role="listbox" aria-label="Résultats">
                {groups.map(group => (
                  <div key={group.id} role="group" aria-label={group.title} className="adm-cmd-section">
                    <div className="adm-cmd-group" aria-hidden="true">{group.title}{group.kind && <span>{group.total}</span>}</div>
                    {group.items.map(item => {
                      position += 1;
                      const i = position;
                      return (
                        <div key={`${item.kind}-${item.href}-${i}`} id={`cmd-${i}`} role="option" aria-selected={i === active} className="adm-cmd-item"
                          onMouseMove={() => setActive(i)} onClick={() => go(item)}>
                          <span className="adm-cmd-icon" aria-hidden="true">{icon(kindIcon[item.kind])}</span>
                          <span className="adm-cmd-text">
                            <b className={item.kind === 'code' || item.kind === 'proposal' ? 'mono' : undefined}>
                              {highlightParts(item.label, query).map((part, n) => part.match ? <mark key={n}>{part.text}</mark> : part.text)}
                            </b>
                            <span className="adm-cmd-dot" aria-hidden="true">·</span>
                            <span className="adm-cmd-detail">{item.detail}</span>
                          </span>
                          {item.status && <StatusDot tone={statusTone[item.status]}>{COMMAND_STATUS_LABELS[item.status]}</StatusDot>}
                          <kbd className="adm-cmd-enter" aria-hidden="true">↵</kbd>
                        </div>
                      );
                    })}
                    {group.kind && group.total > group.items.length && (() => {
                      const kind = group.kind;
                      return (
                        <button type="button" className="adm-cmd-more" tabIndex={-1} onClick={() => { setFilter(kind); input.current?.focus(); }}>
                          Voir les {group.total} {COMMAND_FILTER_LABELS[kind].toLowerCase()}
                        </button>
                      );
                    })()}
                  </div>
                ))}
                {typed && flat.length === 0 && (
                  <div className="adm-cmd-empty">
                    {state === 'loading' ? 'Chargement…' : <><b>Aucun résultat</b><span>Rien ne correspond à « {query.trim()} »{filter !== 'all' ? ` dans ${COMMAND_FILTER_LABELS[filter].toLowerCase()}` : ''}. Essaie un autre mot{filter !== 'all' ? ' ou le filtre « Tout »' : ''}.</span></>}
                  </div>
                )}
              </div>
            </div>
            <div className="adm-cmd-foot" role="status">
              {state === 'error'
                ? <span>Les codes et outils n’ont pas pu être chargés : seules les pages sont proposées.</span>
                : <>
                  <span><kbd>↑↓</kbd> Choisir</span>
                  <span><kbd>↵</kbd> Ouvrir</span>
                  <span><kbd>Tab</kbd> Filtrer</span>
                  <span><kbd>Échap</kbd> Fermer</span>
                  {typed && <span className="adm-cmd-total">{counts[filter]} résultat{counts[filter] > 1 ? 's' : ''}</span>}
                </>}
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
