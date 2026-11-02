'use client';
// Panneau qui glisse depuis la droite : détails d'un élément de liste et ses actions.
// Les formulaires (FormDialog, CodeEditor) s'ouvrent par-dessus, dans un panneau du même côté :
// en les fermant, on retrouve les détails à jour.
import { useEffect, useRef, type ReactNode } from 'react';
import { afterDialogClose } from '@/lib/admin-dialog';

export function AdminDrawer({ open, onClose, label, eyebrow, title, aside, actions, children }: {
  open: boolean; onClose: () => void; label: string; eyebrow: string; title: ReactNode; aside?: ReactNode;
  actions?: ReactNode; children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open) { if (!dialog.current?.open) dialog.current?.showModal(); }
    else dialog.current?.close();
  }, [open]);
  const close = () => dialog.current?.close();
  return (
    <dialog ref={dialog} className="adm-dialog adm-drawer adm-drawer-detail" aria-label={label}
      onClose={() => afterDialogClose(() => { if (!dialog.current?.open) onClose(); })}
      // Un clic sur le voile (hors du panneau) le ferme.
      onClick={event => { if (event.target === dialog.current) close(); }}>
      {open && <div className="adm-drawer-body">
        <div className="adm-drawer-head">
          <div className="adm-drawer-title">
            <span className="eyebrow">{eyebrow}</span>
            <h2>{title}</h2>
          </div>
          {aside}
          <button type="button" className="adm-icon-btn" aria-label="Fermer" onClick={close}>✕</button>
        </div>
        <div className="adm-drawer-content">{children}</div>
        {actions && <div className="adm-drawer-actions">{actions}</div>}
      </div>}
    </dialog>
  );
}

/** Liste de détails « libellé : valeur ». Les valeurs vides sont masquées. */
export function DetailList({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="adm-details">
      {items.filter(item => item.value !== null && item.value !== undefined && item.value !== '' && item.value !== false).map(item => (
        <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>
      ))}
    </dl>
  );
}

/** Ouvre les détails au clic sur une carte ou une ligne, sauf si le clic vise un lien ou un bouton. */
export function openOnClick(open: () => void) {
  return (event: React.MouseEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest('a,button,input,select,textarea,label')) return;
    if (window.getSelection()?.toString()) return;
    open();
  };
}
