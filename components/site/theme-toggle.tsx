'use client';

import { useEffect, useState } from 'react';
import { SITE_THEME_ATTR, nextSiteTheme, readSiteTheme, saveSiteTheme, type SiteTheme } from '@/lib/site-theme';

/** Bouton clair / sombre du site public. Le thème est posé sur <html> (voir SITE_THEME_SCRIPT). */
/** row : version ligne avec son nom, pour les tiroirs du téléphone. */
export function ThemeToggle({ className = 'k-icon-btn', row = false }: { className?: string; row?: boolean }) {
  const [theme, setTheme] = useState<SiteTheme>('light');
  useEffect(() => { setTheme(readSiteTheme(window.localStorage)); }, []);

  const toggle = () => {
    const next = nextSiteTheme(theme);
    setTheme(next);
    saveSiteTheme(window.localStorage, next);
    if (next === 'dark') document.documentElement.setAttribute(SITE_THEME_ATTR, 'dark');
    else document.documentElement.removeAttribute(SITE_THEME_ATTR);
  };

  const dark = theme === 'dark';
  if (row) return (
    <button type="button" className="k-theme-row" role="switch" aria-checked={dark} onClick={toggle}>
      <span>Thème sombre</span><span className="k-theme-switch" aria-hidden="true" />
    </button>
  );
  return (
    <button type="button" className={`${className} k-theme-btn`} aria-pressed={dark} onClick={toggle}
      aria-label="Thème sombre" title={dark ? 'Thème sombre : activé' : 'Thème sombre : désactivé'}>
      {dark
        ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11z" /></svg>
        : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4.2" /><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" /></svg>}
    </button>
  );
}
