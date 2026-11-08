'use client';
// Barre du haut : bouton « + Créer » (menu de ce qu'un visiteur peut ajouter) et icône créateur (son espace).
// Les pages publiques restent en cache : on demande une fois au serveur si un créateur est connecté.
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { useIsOff } from '@/components/site/site-pages';
import { CreatorAvatar } from '@/components/site/creator-avatar';
import { createActions, creatorIconHref, type CreateActionKey } from '@/lib/create-menu';

type Session = { signedIn: boolean; name: string | null };
const SIGNED_OUT: Session = { signedIn: false, name: null };
let pending: Promise<Session> | null = null;

function loadSession(): Promise<Session> {
  pending ??= fetch('/api/creator-auth/me', { credentials: 'same-origin', cache: 'no-store' })
    .then(response => (response.ok ? response.json() as Promise<Session> : SIGNED_OUT))
    .catch(() => SIGNED_OUT);
  return pending;
}

/** Le créateur connecté, demandé une seule fois par chargement de page. */
export function useCreatorSession(): Session {
  const [session, setSession] = useState<Session>(SIGNED_OUT);
  useEffect(() => {
    let live = true;
    loadSession().then(value => { if (live) setSession(value); });
    return () => { live = false; };
  }, []);
  return session;
}

function useActions() {
  const pathname = usePathname();
  const isOff = useIsOff();
  const { signedIn } = useCreatorSession();
  return createActions({ signedIn, from: pathname }).filter(action => !isOff(action.href.split('?')[0]));
}

export function ActionIcon({ name }: { name: CreateActionKey }) {
  const common = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
  if (name === 'submit') return <svg {...common}><path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1.5a2.5 2.5 0 0 0 0 5V16a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1.5a2.5 2.5 0 0 0 0-5z" /><path d="m9.5 14.5 5-5M9.5 9.5h.01M14.5 14.5h.01" /></svg>;
  if (name === 'creator') return <CreatorGlyph />;
  return <svg {...common}><path d="M5 21V4M5 4h11l-2 4 2 4H5" /></svg>;
}

/** Silhouette avec la rosette bleue des créateurs. */
function CreatorGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="10" cy="8" r="3.6" />
      <path d="M3 20c.6-3.6 3.4-5.6 7-5.6 1.2 0 2.3.2 3.2.6" />
      <path className="k-create-rosette" d="m18 13.2 1.2.9 1.5-.1.5 1.4 1.2.8-.4 1.4.4 1.4-1.2.8-.5 1.4-1.5-.1-1.2.9-1.2-.9-1.5.1-.5-1.4-1.2-.8.4-1.4-.4-1.4 1.2-.8.5-1.4 1.5.1z" />
    </svg>
  );
}

/** Bouton « + Créer » et son menu déroulant. Échap, un clic à côté ou un choix le referment. */
export function CreateMenu() {
  const actions = useActions();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const id = useId();
  const pathname = usePathname();

  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); button.current?.focus(); return; }
      if (event.key === 'Tab') { setOpen(false); return; }
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp' && event.key !== 'Home' && event.key !== 'End') return;
      const items = [...(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
      if (items.length === 0) return;
      event.preventDefault();
      const at = items.indexOf(document.activeElement as HTMLElement);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1
        : (at + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      items[next].focus();
    };
    const onClick = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onClick); };
  }, [open]);

  if (actions.length === 0) return null;
  return (
    <div className="k-create" ref={root}>
      <button ref={button} type="button" className="k-create-btn" aria-haspopup="menu" aria-expanded={open} aria-controls={id} onClick={() => setOpen(value => !value)}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
        <span>Créer</span>
      </button>
      <div ref={menu} className="k-create-menu" id={id} role="menu" aria-label="Créer" data-open={open} hidden={!open}>
        {actions.map(action => (
          <Link key={action.key} role="menuitem" className={`k-create-item is-${action.key}`} href={action.href} onClick={() => setOpen(false)}>
            <span className="k-create-ico"><ActionIcon name={action.key} /></span>
            <span className="k-create-text"><b>{action.label}</b><small>{action.hint}</small></span>
          </Link>
        ))}
      </div>
    </div>
  );
}

/** Les mêmes choix en liste, pour les menus du téléphone (tiroir de l'Explorer, menu burger du site). */
export function CreateList({ onPick }: { onPick?: () => void }) {
  const actions = useActions();
  if (actions.length === 0) return null;
  return (
    <div className="k-create-list" role="group" aria-label="Créer">
      {actions.map(action => (
        <Link key={action.key} className={`k-create-item is-${action.key}`} href={action.href} onClick={onPick}>
          <span className="k-create-ico"><ActionIcon name={action.key} /></span>
          <span className="k-create-text"><b>{action.label}</b><small>{action.hint}</small></span>
        </Link>
      ))}
    </div>
  );
}

/** Icône créateur : sa photo une fois connecté (son espace), sinon la silhouette (la page pour ouvrir son compte). */
export function CreatorButton() {
  const { signedIn, name } = useCreatorSession();
  const isOff = useIsOff();
  const href = creatorIconHref(signedIn);
  if (isOff(href)) return null;
  const label = signedIn ? 'Mon espace créateur' : 'Espace créateur : ouvrir mon compte';
  return (
    <Link className={`k-icon-btn k-creator-btn${signedIn ? ' is-in' : ''}`} href={href} aria-label={label} title={label}>
      {signedIn && name ? <CreatorAvatar name={name} size="xs" /> : <CreatorGlyph />}
    </Link>
  );
}
