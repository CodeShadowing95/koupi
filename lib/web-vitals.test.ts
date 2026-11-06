import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { describe, expect, it } from 'vitest';
import type { Db } from '@/db';
import * as schema from '@/db/schema';
import { buildVitalsReport, pageGroup, pageVerdict, parseVital, recordVital, verdictOf, vitalsReport } from './web-vitals';

describe('pageGroup', () => {
  it('keeps only the kind of page, never the exact address', () => {
    expect(pageGroup('/')).toBe('home');
    expect(pageGroup('/codes?tool=notion')).toBe('codes');
    expect(pageGroup('/tools/notion')).toBe('tool');
    expect(pageGroup('/creators/ali')).toBe('creator');
    expect(pageGroup('/creators/')).toBe('creators');
    expect(pageGroup('/categories/vpn')).toBe('category');
    expect(pageGroup('/search?q=mon%20email')).toBe('other');
  });
});

describe('parseVital', () => {
  it('accepts a well formed measure', () => {
    expect(parseVital({ path: '/tools/notion', metric: 'LCP', device: 'mobile', rating: 'good' })).toEqual({ page: 'tool', metric: 'LCP', device: 'mobile', rating: 'good' });
  });
  it('refuses anything unexpected', () => {
    expect(parseVital({ path: 'https://evil.test', metric: 'LCP', device: 'mobile', rating: 'good' })).toBeNull();
    expect(parseVital({ path: '/', metric: 'FID', device: 'mobile', rating: 'good' })).toBeNull();
    expect(parseVital({ path: '/', metric: 'LCP', device: 'tv', rating: 'good' })).toBeNull();
    expect(parseVital({ path: '/', metric: 'LCP', device: 'mobile', rating: 'great' })).toBeNull();
    expect(parseVital({ path: `/${'a'.repeat(400)}`, metric: 'LCP', device: 'mobile', rating: 'good' })).toBeNull();
  });
});

describe('verdictOf', () => {
  it('follows the 75th percentile rule', () => {
    expect(verdictOf(15, 3, 2)).toBe('good');
    expect(verdictOf(10, 4, 6)).toBe('poor');
    expect(verdictOf(12, 5, 3)).toBe('needs-improvement');
  });
  it('waits for enough visits', () => expect(verdictOf(5, 0, 0)).toBe('unknown'));
});

describe('pageVerdict', () => {
  const cell = (verdict: 'good' | 'needs-improvement' | 'poor' | 'unknown') => ({ good: 0, needs: 0, poor: 0, total: 0, goodShare: 0, verdict });
  it('takes the worst core measure', () => {
    expect(pageVerdict([cell('good'), cell('poor'), cell('good')])).toBe('poor');
    expect(pageVerdict([cell('good'), cell('good'), cell('good')])).toBe('good');
    expect(pageVerdict([cell('good'), cell('unknown'), cell('good')])).toBe('unknown');
  });
});

describe('buildVitalsReport', () => {
  it('groups by page and device', () => {
    const report = buildVitalsReport([
      { page: 'tool', metric: 'LCP', device: 'mobile', rating: 'good', count: 18 },
      { page: 'tool', metric: 'LCP', device: 'mobile', rating: 'poor', count: 2 },
      { page: 'home', metric: 'CLS', device: 'desktop', rating: 'good', count: 3 },
    ], 28);
    expect(report.samples).toBe(20);
    const tool = report.rows.find(row => row.page === 'tool' && row.device === 'mobile');
    expect(tool?.metrics.LCP).toMatchObject({ good: 18, poor: 2, total: 20, goodShare: 0.9, verdict: 'good' });
    expect(tool?.verdict).toBe('unknown');
    expect(report.rows.map(row => row.page)).toEqual(['home', 'tool']);
  });
});

describe('recordVital', () => {
  it('adds one to the total of the day', async () => {
    const db = drizzle(new PGlite(), { schema }) as unknown as Db;
    await migrate(db as never, { migrationsFolder: 'db/migrations' });
    const now = new Date('2026-11-06T12:00:00Z');
    const vital = { page: 'codes', metric: 'INP', device: 'mobile', rating: 'good' } as const;
    await recordVital(db, vital, now);
    await recordVital(db, vital, now);
    const report = await vitalsReport(db, 28, now);
    expect(report.rows[0].metrics.INP).toMatchObject({ good: 2, total: 2 });
  });
});
