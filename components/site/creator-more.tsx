'use client';
// « Plus d'infos » de la page créateur : la bio, les thèmes, les comptes et la vérification restent repliés
// pour que le visiteur voie d'abord le créateur et ses codes. Le dépliage glisse (grille 0fr → 1fr),
// sans animation quand prefers-reduced-motion est actif.
import { useId, useState, type ReactNode } from 'react';

export function CreatorMore({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <>
      <button type="button" className={`k-creator-more-toggle${open ? ' is-open' : ''}`} aria-expanded={open} aria-controls={id} onClick={() => setOpen(value => !value)}>
        {open ? 'Moins d’infos' : 'Plus d’infos'}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
      </button>
      <div id={id} className={`k-creator-more${open ? ' is-open' : ''}`} inert={!open}>
        <div className="k-creator-more-inner">{children}</div>
      </div>
    </>
  );
}
