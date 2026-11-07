import { describe, expect, it } from 'vitest';
import { bypassesMaintenance, isPathOff, pageForPath, SITE_PAGES, siteDecision } from './site-pages';

describe('pageForPath', () => {
  it('trouve la page d’une adresse et de ses sous-pages', () => {
    expect(pageForPath('/')?.key).toBe('home');
    expect(pageForPath('/categories')?.key).toBe('categories');
    expect(pageForPath('/categories/vpn')?.key).toBe('categories');
    expect(pageForPath('/creators/ana')?.key).toBe('creators');
    expect(pageForPath('/creator/sign-in')?.key).toBe('creator-space');
    expect(pageForPath('/api/submissions')?.key).toBe('submit');
    expect(pageForPath('/explore')?.key).toBe('codes');
    expect(pageForPath('/codesx')).toBeNull();
    expect(pageForPath('/admin')).toBeNull();
  });
  it('ne confond pas /creator et /creators', () => {
    expect(pageForPath('/creators')?.key).toBe('creators');
    expect(pageForPath('/creator')?.key).toBe('creator-space');
  });
});

describe('isPathOff', () => {
  it('coupe une page, ses sous-pages et ses API', () => {
    expect(isPathOff('/categories/vpn', ['categories'])).toBe(true);
    expect(isPathOff('/categories?x=1', ['categories'])).toBe(true);
    expect(isPathOff('/api/submissions', ['submit'])).toBe(true);
    expect(isPathOff('/codes', ['categories'])).toBe(false);
  });
  it('ne coupe jamais une page verrouillée', () => {
    expect(SITE_PAGES.filter(page => page.locked).map(page => page.key)).toEqual(['home', 'legal', 'privacy']);
    expect(isPathOff('/legal', ['legal'])).toBe(false);
    expect(isPathOff('/', ['home'])).toBe(false);
  });
});

describe('siteDecision', () => {
  const on = { off: [], maintenance: false };
  it('laisse passer quand rien n’est coupé', () => {
    expect(siteDecision('/codes', on, false)).toBe('pass');
    expect(siteDecision('/maintenance', on, false)).toBe('not-found');
  });
  it('répond 404 pour une page coupée, même à l’admin', () => {
    expect(siteDecision('/categories', { off: ['categories'], maintenance: false }, false)).toBe('not-found');
    expect(siteDecision('/categories', { off: ['categories'], maintenance: false }, true)).toBe('not-found');
  });
  it('met le site en pause sauf pour l’admin, ses API et les fichiers', () => {
    const paused = { off: [], maintenance: true };
    expect(siteDecision('/', paused, false)).toBe('maintenance');
    expect(siteDecision('/api/submissions', paused, false)).toBe('maintenance');
    expect(siteDecision('/', paused, true)).toBe('pass');
    expect(siteDecision('/admin/login', paused, false)).toBe('pass');
    expect(siteDecision('/api/admin/login', paused, false)).toBe('pass');
    expect(siteDecision('/maintenance', paused, false)).toBe('pass');
    expect(bypassesMaintenance('/logos/nordvpn.png')).toBe(true);
    expect(bypassesMaintenance('/api/cron/retest')).toBe(true);
  });
});
