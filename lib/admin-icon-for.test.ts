import { describe, expect, it } from 'vitest';
import { iconForHref } from './admin-icon-for';
import { ADMIN_PAGES } from './admin-command';

describe('iconForHref', () => {
  it('uses the sidebar icon of the section a link belongs to', () => {
    expect(iconForHref('/admin')).toBe('home');
    expect(iconForHref('/admin/stats')).toBe('stats');
    expect(iconForHref('/admin/codes?status=retest')).toBe('ticket');
    expect(iconForHref('/admin/guide/se-reperer')).toBe('book');
    expect(iconForHref('/admin/createurs?q=Ali')).toBe('users');
    expect(iconForHref('/admin/podcasts')).toBe('mic');
  });
  it('shows a download icon for every export', () => {
    const exports = ADMIN_PAGES.filter(page => page.href.startsWith('/api/admin/export'));
    expect(exports.length).toBeGreaterThan(0);
    expect(exports.every(page => iconForHref(page.href) === 'download')).toBe(true);
  });
  it('does not confuse a prefix with another page', () => {
    expect(iconForHref('/admin/codesx')).toBe('home');
  });
});
