'use client';
// Cloche de la barre du haut : nouvelles propositions, codes signalés, rappels de tests.
// La liste est rechargée à chaque page, au retour sur l'onglet et après une modération.
// Lu / non lu est retenu dans ce navigateur : un clic sur une ligne la marque comme lue, « Tout marquer comme lu » les marque toutes.
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SUBMISSIONS_CHANGED } from '@/app/admin/pending-count';
import { AdminIcon, type IconName } from '@/components/admin-icons';
import {
  NOTIFICATION_TABS, NOTIFICATION_TAB_LABELS, NOTIFICATIONS_SEEN_KEY, countByTab, markRead, parseSeen, timeAgo, unseen,
  type AdminNotification, type NotificationKind, type NotificationTab,
} from '@/lib/admin-notifications';

const bell = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </svg>
);
const checks = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m2 12.5 4.5 4.5L15 8.5" /><path d="m11.5 15.5 1.5 1.5L22 8" />
  </svg>
);
const kindIcon: Record<NotificationKind, IconName> = { proposal: 'inbox', flag: 'ticket', reminder: 'clock' };

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
  const [tab, setTab] = useState<NotificationTab>('all');
  const [busy, setBusy] = useState<string | null>(null);

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

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); button.current?.focus(); } };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onPointer); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const list = items ?? [];
  const unread = new Set(unseen(list, seen).map(item => item.id));
  const counts = countByTab(list);
  const shown = tab === 'all' ? list : list.filter(item => item.kind === tab);

  function read(ids: string[]) {
    const next = markRead(list, seen, ids);
    setSeen(next); writeSeen(next);
  }
  // Refuser une proposition sans quitter la page ; Valider demande le formulaire de la page Propositions.
  async function reject(item: AdminNotification) {
    if (!item.proposalId) return;
    setBusy(item.id);
    try {
      const response = await fetch('/api/admin/submissions', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: item.proposalId, action: 'reject', note: '' }) });
      if (response.ok) { read([item.id]); window.dispatchEvent(new Event(SUBMISSIONS_CHANGED)); }
    } finally { setBusy(null); }
  }

  const count = unread.size;
  const label = count ? `Notifications, ${count} non lue${count > 1 ? 's' : ''}` : 'Notifications';
  return (
    <div className="adm-bell" ref={root} data-open={open ? '' : undefined}>
      <button ref={button} type="button" className="adm-icon-btn adm-bell-btn" aria-label={label} aria-expanded={open} aria-controls="adm-bell-panel" onClick={() => setOpen(value => !value)}>
        {bell}
        {count > 0 && <span className="adm-bell-badge" aria-hidden="true">{count > 9 ? '9+' : count}</span>}
      </button>
      {open && (
        <div className="adm-bell-panel" id="adm-bell-panel" role="dialog" aria-label="Notifications">
          <div className="adm-bell-head">
            <h2>Notifications</h2>
            <button type="button" className="adm-bell-readall" disabled={count === 0} onClick={() => read(list.map(item => item.id))}>{checks}Tout marquer comme lu</button>
          </div>
          <div className="adm-bell-tabs" role="tablist" aria-label="Filtrer les notifications">
            {NOTIFICATION_TABS.map(name => (
              <button key={name} type="button" role="tab" aria-selected={tab === name} className="adm-bell-tab" onClick={() => setTab(name)}>
                {NOTIFICATION_TAB_LABELS[name]}<span>{counts[name]}</span>
              </button>
            ))}
          </div>
          {failed && !items ? (
            <p className="adm-bell-empty">Les notifications n’ont pas pu être chargées. Réessaie dans un instant.</p>
          ) : !items ? (
            <p className="adm-bell-empty">Chargement…</p>
          ) : shown.length === 0 ? (
            <div className="adm-bell-empty"><b>Tout est à jour</b><span>{tab === 'all' ? 'Rien ne t’attend pour l’instant.' : `Aucune notification dans « ${NOTIFICATION_TAB_LABELS[tab]} ».`}</span></div>
          ) : (
            <ul className="adm-bell-list">
              {shown.map(item => (
                <li key={item.id} className="adm-bell-item" data-unread={unread.has(item.id) ? '' : undefined}>
                  <span className="adm-bell-avatar" data-tone={item.tone} aria-hidden="true">
                    <AdminIcon name={kindIcon[item.kind]} size={18} stroke={1.8} />
                    {item.tone === 'bad' && <span className="adm-bell-mark">!</span>}
                  </span>
                  <div className="adm-bell-body">
                    <Link href={item.href} className="adm-bell-link" onClick={() => { read([item.id]); setOpen(false); }}>
                      <b className={item.kind === 'reminder' ? undefined : 'mono'}>{item.subject}</b> {item.text}
                    </Link>
                    <div className="adm-bell-sub">
                      <span>{item.detail}</span>
                      {item.at && <time dateTime={item.at} suppressHydrationWarning>{timeAgo(item.at)}</time>}
                    </div>
                    {item.proposalId && (
                      <div className="adm-bell-actions">
                        <button type="button" className="adm-btn" disabled={busy === item.id} onClick={() => reject(item)}>Refuser</button>
                        <Link href={item.href} className="adm-btn adm-btn-pri" onClick={() => { read([item.id]); setOpen(false); }}>Examiner</Link>
                      </div>
                    )}
                  </div>
                  {unread.has(item.id) && <span className="adm-bell-dot" aria-label="Non lue" />}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
