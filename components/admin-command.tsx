'use client';
// Recherche globale du back-office : ⌘K (Mac) ou Ctrl+K, ou le bouton de la barre du haut.
// Flèches pour choisir, Entrée pour ouvrir, Échap pour fermer. L'index est rechargé à chaque ouverture.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ADMIN_PAGES, COMMAND_KIND_LABELS, searchCommands, type CommandItem } from '@/lib/admin-command';

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

  let position = -1;
  return (
    <>
      <button type="button" className="adm-cmd-trigger" onClick={show} aria-keyshortcuts={mac ? 'Meta+K' : 'Control+K'}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <span className="adm-cmd-trigger-text">Rechercher</span>
        <kbd suppressHydrationWarning>{mac ? '⌘' : 'Ctrl'} K</kbd>
      </button>
      <dialog ref={dialog} className="adm-dialog adm-cmd" aria-label="Recherche globale" onClose={() => setOpen(false)}
        onClick={event => { if (event.target === dialog.current) dialog.current?.close(); }}>
        {open && (
          <div className="adm-cmd-body">
            <div className="adm-cmd-field">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
              <input ref={input} autoFocus type="text" value={query} onChange={event => setQuery(event.target.value)} onKeyDown={onKeyDown}
                placeholder="Code, outil, créateur, page…" aria-label="Rechercher dans le back-office" role="combobox" aria-expanded="true"
                aria-controls="cmd-results" aria-activedescendant={flat.length ? `cmd-${active}` : undefined} aria-autocomplete="list" />
              <kbd>Échap</kbd>
            </div>
            <div className="adm-cmd-results" id="cmd-results" role="listbox" aria-label="Résultats">
              {groups.map(group => (
                <div key={group.kind} role="group" aria-label={COMMAND_KIND_LABELS[group.kind]}>
                  <div className="adm-cmd-group">{COMMAND_KIND_LABELS[group.kind]}</div>
                  {group.items.map(item => {
                    position += 1;
                    const i = position;
                    return (
                      <div key={`${item.kind}-${item.href}-${i}`} id={`cmd-${i}`} role="option" aria-selected={i === active} className="adm-cmd-item"
                        onMouseMove={() => setActive(i)} onClick={() => go(item)}>
                        <b className={item.kind === 'code' || item.kind === 'proposal' ? 'mono' : undefined}>{item.label}</b>
                        <span>{item.detail}</span>
                      </div>
                    );
                  })}
                </div>
              ))}
              {flat.length === 0 && <div className="adm-cmd-empty">{state === 'loading' ? 'Chargement…' : `Rien ne correspond à « ${query} ».`}</div>}
            </div>
            <div className="adm-cmd-foot" role="status">
              {state === 'error' ? 'Les codes et outils n’ont pas pu être chargés : seules les pages sont proposées.' : state === 'loading' ? 'Chargement des codes et outils…' : '↑ ↓ pour choisir · Entrée pour ouvrir'}
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
