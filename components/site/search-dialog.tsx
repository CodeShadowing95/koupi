'use client';
import { useEffect, useRef, useState } from 'react';
import { gsap, MOTION_OK, useGSAP } from '@/lib/gsap';
import { SearchBar } from './search-bar';

const Icon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
);

/**
 * La recherche du hero : la barre est un bouton qui ouvre une fenêtre de recherche au centre de l'écran
 * (<dialog> natif : focus gardé dedans, Échap pour fermer, clic à côté pour fermer).
 * Raccourcis : « / » ou Ctrl/Cmd + K depuis n'importe où sur la page.
 */
export function SearchDialog({ placeholder = 'Hostinger, NordVPN, ElevenLabs…' }: { placeholder?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const { contextSafe } = useGSAP({ scope: dialog });

  const show = contextSafe(() => {
    const el = dialog.current;
    if (!el || el.open) return;
    el.showModal();
    setOpen(true);
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      gsap.fromTo('.k-palette-panel', { y: -18, scale: 0.97, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.35, ease: 'power3.out' });
    });
  });
  const close = () => dialog.current?.close();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable;
      if ((event.key === '/' && !typing) || (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey))) {
        event.preventDefault();
        show();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [show]);

  return (
    <div className="k-search">
      <button type="button" className="k-search-box k-search-trigger" onClick={show} aria-haspopup="dialog" aria-expanded={open}>
        <Icon />
        <span className="k-search-placeholder">{placeholder}</span>
        <kbd className="k-kbd" aria-hidden="true">/</kbd>
        <span className="k-btn k-btn-primary" aria-hidden="true">Trouver le code</span>
      </button>
      <dialog
        ref={dialog}
        className="k-palette"
        aria-label="Rechercher un outil"
        onClose={() => setOpen(false)}
        onClick={event => { if (event.target === dialog.current) close(); }}
      >
        <div className="k-palette-panel">
          <div className="k-palette-head">
            <span className="k-eyebrow">Trouve le code de ton outil</span>
            <button type="button" className="k-palette-close" onClick={close} aria-label="Fermer la recherche">Échap</button>
          </div>
          {/* Monté seulement à l'ouverture : le champ prend le focus et repart vide à chaque fois. */}
          {open && <SearchBar variant="palette" autoFocusShortcut={false} placeholder={placeholder} onNavigate={close} onDismiss={close} />}
          <p className="k-palette-foot"><kbd className="k-kbd">↑</kbd><kbd className="k-kbd">↓</kbd> pour choisir · <kbd className="k-kbd">Entrée</kbd> pour ouvrir</p>
        </div>
      </dialog>
    </div>
  );
}
