'use client';
// Cloche de la barre du haut : nouvelles propositions, codes signalés, codes à retester ou à tester.
// La liste est rechargée à chaque page, au retour sur l'onglet et après une modération.
// Ce qui a été vu est retenu dans ce navigateur : ouvrir la cloche marque tout comme vu.
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SUBMISSIONS_CHANGED } from '@/app/admin/pending-count';
import { NOTIFICATIONS_SEEN_KEY, parseSeen, timeAgo, unseen, type AdminNotification } from '@/lib/admin-notifications';

const bell = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </svg>
);

function readSeen(): string[] {
  try { return parseSeen(localStorage.getItem(NOTIFICATIONS_SEEN_KEY)); } catch { return []; }
}
function writeSeen(ids: string[]) {
  try { localStorage.setItem(NOTIFICATIONS_SEEN_KEY, JSON.stringify(ids)); } catch { /* navigation privée : rien n'est retenu */ }
}

export function AdminNotifications() {
  const pathname = usePathname();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const [items, setItems] = useState<AdminNotification[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [seen, setSeen] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  // Les pastilles « nouveau » restent visibles pendant que le panneau est ouvert, même si tout vient d'être marqué comme vu.
  const [fresh, setFresh] = useState<Set<string>>(new Set());

  const load = useCallback(() => {
    fetch('/api/admin/notifications')
      .then(response => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
      .then((body: { items: AdminNotification[] }) => { setItems(body.items); setFailed(false); })
      .catch(() => setFailed(true));
  }, []);

  useEffect(() => { setSeen(readSeen()); }, []);
  useEffect(() => { load(); setOpen(false); }, [pathname, load]);
  useEffect(() => {
    window.addEventListener(SUBMISSIONS_CHANGED, load);
    window.addEventListener('focus', load);
    return () => { window.removeEventListener(SUBMISSIONS_CHANGED, load); window.removeEventListener('focus', load); };
  }, [load]);

  const unread = items ? unseen(items, seen) : [];

  function markSeen(list: AdminNotification[]) {
    const ids = list.map(item => item.id);
    setSeen(ids); writeSeen(ids);
  }
  function toggle() {
    if (open) { setOpen(false); return; }
    setFresh(new Set(unread.map(item => item.id)));
    setOpen(true);
    if (items) markSeen(items);
  }

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); button.current?.focus(); } };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onPointer); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const count = unread.length;
  const label = count ? `Notifications, ${count} nouvelle${count > 1 ? 's' : ''}` : 'Notifications';
  return (
    <div className="adm-bell" ref={root} data-open={open ? '' : undefined}>
      <button ref={button} type="button" className="adm-icon-btn adm-bell-btn" aria-label={label} aria-expanded={open} aria-controls="adm-bell-panel" onClick={toggle}>
        {bell}
        {count > 0 && <span className="adm-bell-badge" aria-hidden="true">{count > 9 ? '9+' : count}</span>}
      </button>
      {open && (
        <div className="adm-bell-panel" id="adm-bell-panel" role="dialog" aria-label="Notifications">
          <div className="adm-bell-head">
            <b>Notifications</b>
            {fresh.size > 0 && <span className="adm-bell-new">{fresh.size} nouvelle{fresh.size > 1 ? 's' : ''}</span>}
          </div>
          {failed && !items ? (
            <p className="adm-bell-empty">Les notifications n’ont pas pu être chargées. Réessaie dans un instant.</p>
          ) : !items ? (
            <p className="adm-bell-empty">Chargement…</p>
          ) : items.length === 0 ? (
            <div className="adm-bell-empty"><b>Tout est à jour</b><span>Aucune proposition à traiter ni code à tester. Profites-en pour chercher de nouveaux codes.</span></div>
          ) : (
            <ul className="adm-bell-list">
              {items.map(item => (
                <li key={item.id}>
                  <Link href={item.href} className="adm-bell-item" data-tone={item.tone} onClick={() => setOpen(false)}>
                    <span className="adm-bell-dot" aria-hidden="true" />
                    <span className="adm-bell-text">
                      <b>{item.title}</b>
                      <span>{item.detail}</span>
                    </span>
                    <span className="adm-bell-meta">
                      {fresh.has(item.id) && <span className="adm-bell-fresh">Nouveau</span>}
                      {item.at && <time dateTime={item.at} suppressHydrationWarning>{timeAgo(item.at)}</time>}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link href="/admin" className="adm-bell-foot" onClick={() => setOpen(false)}>Voir le tableau de bord</Link>
        </div>
      )}
    </div>
  );
}
