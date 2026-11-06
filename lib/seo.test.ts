import { describe, expect, it } from 'vitest';
import type { Code } from './data';
import { isIndexable, robotsRules, siteUrl, sitemapEntries } from './seo';

const code = (over: Partial<Code>): Code => ({
  id: 'c1', tool: 'Notion', toolSlug: 'notion', creator: 'Ali', creatorSlug: 'ali', code: 'ALI10', discount: '-10 %', status: 'verified',
  source: 'https://youtube.com/watch?v=1', sourceTitle: 'Vidéo', votes: 0, success: 0, lastTestedAt: null, paymentTestedAt: null,
  expiresOn: null, createdAt: '2026-10-01T10:00:00.000Z', ...over,
});

const catalog = {
  categories: [
    { slug: 'productivite', name: 'Productivité', family: null, count: 2, tracked: 2 },
    { slug: 'vide', name: 'Vide', family: null, count: 0, tracked: 1 },
  ],
  tools: [{ slug: 'notion', name: 'Notion', category: 'Productivité', website: 'https://notion.so', description: '', priority: 1, codes: 2 }],
  codes: [
    code({}),
    code({ id: 'c2', creator: 'Bea', creatorSlug: 'bea', lastTestedAt: '2026-11-02T08:00:00.000Z' }),
    code({ id: 'c3', creator: 'Cache', creatorSlug: 'cache', status: 'pending' }),
  ],
};

describe('siteUrl', () => {
  it('defaults to merkod.com', () => expect(siteUrl({})).toBe('https://merkod.com'));
  it('cleans the configured address', () => {
    expect(siteUrl({ NEXT_PUBLIC_SITE_URL: ' "www.merkod.com/" ' })).toBe('https://www.merkod.com');
    expect(siteUrl({ NEXT_PUBLIC_SITE_URL: 'http://localhost:3000' })).toBe('http://localhost:3000');
  });
});

describe('isIndexable', () => {
  it('opens only the Vercel production', () => {
    expect(isIndexable({ VERCEL_ENV: 'production' })).toBe(true);
    expect(isIndexable({ VERCEL_ENV: 'preview', NODE_ENV: 'production' })).toBe(false);
    expect(isIndexable({ NODE_ENV: 'development' })).toBe(false);
  });
});

describe('robotsRules', () => {
  it('closes the whole site outside production', () => {
    expect(robotsRules(false, 'https://merkod.com')).toEqual({ rules: { userAgent: '*', disallow: '/' } });
  });
  it('hides private pages and points to the sitemap in production', () => {
    const robots = robotsRules(true, 'https://merkod.com');
    expect(robots.sitemap).toBe('https://merkod.com/sitemap.xml');
    expect(JSON.stringify(robots.rules)).toContain('/admin');
    // Aucune règle ne doit couper les pages créateurs publiques (/creators/…).
    const disallow = (robots.rules as { disallow: string[] }).disallow;
    expect(disallow.some(rule => !rule.endsWith('$') && '/creators/ali'.startsWith(rule))).toBe(false);
  });
});

describe('sitemapEntries', () => {
  const urls = (off: Parameters<typeof sitemapEntries>[1] = []) => sitemapEntries(catalog, off, 'https://merkod.com').map(entry => entry.url);

  it('lists static pages, filled categories, tools and creators with a public code', () => {
    const list = urls();
    expect(list).toContain('https://merkod.com');
    expect(list).toContain('https://merkod.com/codes');
    expect(list).toContain('https://merkod.com/categories/productivite');
    expect(list).not.toContain('https://merkod.com/categories/vide');
    expect(list).not.toContain('https://merkod.com/categories');
    expect(list).toContain('https://merkod.com/tools/notion');
    expect(list).toContain('https://merkod.com/creators/ali');
    expect(list).not.toContain('https://merkod.com/creators/cache');
    expect(list.some(url => url.includes('/search') || url.includes('/admin') || url.endsWith('/creator'))).toBe(false);
  });

  it('dates a tool by its latest tested or added code', () => {
    const tool = sitemapEntries(catalog, [], 'https://merkod.com').find(entry => entry.url.endsWith('/tools/notion'));
    expect(tool?.lastModified).toBe('2026-11-02T08:00:00.000Z');
  });

  it('leaves out pages switched off in the admin', () => {
    const list = urls(['tools', 'creators']);
    expect(list.some(url => url.includes('/tools/') || url.includes('/creators'))).toBe(false);
    expect(list).toContain('https://merkod.com/codes');
  });
});
