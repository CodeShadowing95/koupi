import { describe, expect, it } from 'vitest';
import { SITE_THEME_ATTR, SITE_THEME_KEY, SITE_THEME_SCRIPT, nextSiteTheme, parseSiteTheme, readSiteTheme, saveSiteTheme } from './site-theme';

function memory(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => void data.set(key, value), data };
}

describe('thème du site public', () => {
  it('est clair par défaut', () => {
    expect(parseSiteTheme(null)).toBe('light');
    expect(parseSiteTheme('autre')).toBe('light');
    expect(readSiteTheme(undefined)).toBe('light');
    expect(readSiteTheme(memory())).toBe('light');
  });

  it('retient le thème sombre choisi', () => {
    const store = memory();
    saveSiteTheme(store, 'dark');
    expect(store.data.get(SITE_THEME_KEY)).toBe('dark');
    expect(readSiteTheme(store)).toBe('dark');
  });

  it('bascule entre clair et sombre', () => {
    expect(nextSiteTheme('light')).toBe('dark');
    expect(nextSiteTheme('dark')).toBe('light');
  });

  it('survit à un stockage qui refuse l’accès', () => {
    const broken = { getItem: () => { throw new Error('bloqué'); }, setItem: () => { throw new Error('bloqué'); } };
    expect(readSiteTheme(broken)).toBe('light');
    expect(() => saveSiteTheme(broken, 'dark')).not.toThrow();
  });

  it('pose le thème sombre avant l’affichage', () => {
    const attrs = new Map<string, string>();
    const run = new Function('localStorage', 'document', SITE_THEME_SCRIPT);
    const doc = { documentElement: { setAttribute: (name: string, value: string) => attrs.set(name, value) } };
    run(memory({ [SITE_THEME_KEY]: 'dark' }), doc);
    expect(attrs.get(SITE_THEME_ATTR)).toBe('dark');
    attrs.clear();
    run(memory(), doc);
    expect(attrs.size).toBe(0);
  });
});
