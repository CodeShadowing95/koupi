'use client';
// Bascule Cartes / Tableau des listes du back-office, mémorisée dans le navigateur.
import { useEffect, useState } from 'react';
import { ADMIN_VIEW_KEY, parseAdminView, type AdminView } from '@/lib/admin-view';

export function useAdminView(): [AdminView, (view: AdminView) => void] {
  const [view, setView] = useState<AdminView>('cards');
  useEffect(() => {
    try { setView(parseAdminView(window.localStorage.getItem(ADMIN_VIEW_KEY))); } catch { /* stockage indisponible */ }
  }, []);
  function choose(next: AdminView) {
    setView(next);
    try { window.localStorage.setItem(ADMIN_VIEW_KEY, next); } catch { /* stockage indisponible */ }
  }
  return [view, choose];
}

function CardsIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="currentColor"><rect x="1" y="1" width="6" height="6" rx="1.5" /><rect x="9" y="1" width="6" height="6" rx="1.5" /><rect x="1" y="9" width="6" height="6" rx="1.5" /><rect x="9" y="9" width="6" height="6" rx="1.5" /></svg>;
}

function TableIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="currentColor"><rect x="1" y="2" width="14" height="2.5" rx="1" /><rect x="1" y="6.75" width="14" height="2.5" rx="1" /><rect x="1" y="11.5" width="14" height="2.5" rx="1" /></svg>;
}

export function ViewToggle({ view, onChange }: { view: AdminView; onChange: (view: AdminView) => void }) {
  return (
    <div className="adm-view" role="group" aria-label="Affichage de la liste">
      <button type="button" aria-pressed={view === 'cards'} onClick={() => onChange('cards')} title="Vue cartes" aria-label="Vue cartes"><CardsIcon /><span>Cartes</span></button>
      <button type="button" aria-pressed={view === 'table'} onClick={() => onChange('table')} title="Vue tableau" aria-label="Vue tableau"><TableIcon /><span>Tableau</span></button>
    </div>
  );
}
