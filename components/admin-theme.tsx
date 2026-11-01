'use client';
// Thème clair / sombre du back-office. Sans choix enregistré, on suit le réglage du système.
// Le choix est posé sur .admin-root (data-theme) et gardé dans le navigateur.
import { useEffect, useState } from 'react';

import { ADMIN_THEME_KEY } from '@/lib/admin-theme';

export type AdminTheme = 'light' | 'dark';

function rootOf(): HTMLElement | null { return document.querySelector('.admin-root'); }

/** Thème réellement affiché : le choix enregistré, sinon celui du système. */
export function currentTheme(): AdminTheme {
  const forced = rootOf()?.getAttribute('data-theme');
  if (forced === 'light' || forced === 'dark') return forced;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Suit le thème affiché (bouton, réglage système) : les graphiques s'en servent pour se recolorer. */
export function useAdminTheme(): AdminTheme {
  const [theme, setTheme] = useState<AdminTheme>('light');
  useEffect(() => {
    const update = () => setTheme(currentTheme());
    update();
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', update);
    const root = rootOf();
    const observer = new MutationObserver(update);
    if (root) observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    return () => { media.removeEventListener('change', update); observer.disconnect(); };
  }, []);
  return theme;
}

export function ThemeToggle() {
  const theme = useAdminTheme();
  const next: AdminTheme = theme === 'dark' ? 'light' : 'dark';
  function toggle() {
    rootOf()?.setAttribute('data-theme', next);
    try { window.localStorage.setItem(ADMIN_THEME_KEY, next); } catch { /* stockage indisponible */ }
  }
  const label = next === 'dark' ? 'Passer en mode sombre' : 'Passer en mode clair';
  return (
    <button type="button" className="adm-icon-btn" onClick={toggle} aria-label={label} title={label}>
      {theme === 'dark'
        ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
        : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>}
    </button>
  );
}

/** Lit une variable CSS du thème affiché (couleurs des graphiques). */
export function cssVar(name: string): string {
  const root = rootOf();
  return root ? getComputedStyle(root).getPropertyValue(name).trim() : '';
}
