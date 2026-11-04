import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Db } from '@/db';
import * as schema from '@/db/schema';
import { auditLabel, formatAuditDate } from './admin-audit';
import { listAuditLog, loadSiteState, purgeAuditLog, setSiteSwitch } from './site-settings';

describe('site settings', () => {
  let db: Db;
  beforeEach(async () => {
    db = drizzle(new PGlite(), { schema }) as unknown as Db;
    await migrate(db as never, { migrationsFolder: 'db/migrations' });
  });

  it('part d’un site entièrement en ligne', async () => {
    expect(await loadSiteState(db)).toMatchObject({ off: [], maintenance: false, rows: [] });
  });

  it('coupe et rallume une page, et le note au journal', async () => {
    expect(await setSiteSwitch(db, { target: 'categories', enabled: false })).toEqual({ ok: true, data: { key: 'page:categories', enabled: false } });
    expect((await loadSiteState(db)).off).toEqual(['categories']);
    await setSiteSwitch(db, { target: 'categories', enabled: true });
    expect((await loadSiteState(db)).off).toEqual([]);
    const journal = await listAuditLog(db);
    expect(journal.map(entry => [entry.action, entry.target])).toEqual(expect.arrayContaining([['page_off', 'Pages de catégorie'], ['page_on', 'Pages de catégorie']]));
  });

  it('met le site en pause', async () => {
    await setSiteSwitch(db, { target: 'maintenance', enabled: true });
    expect((await loadSiteState(db)).maintenance).toBe(true);
    expect((await listAuditLog(db))[0]).toMatchObject({ action: 'maintenance_on', target: 'Site entier' });
  });

  it('refuse les pages verrouillées et les entrées invalides', async () => {
    expect(await setSiteSwitch(db, { target: 'legal', enabled: false })).toEqual({ ok: false, error: 'Mentions légales reste toujours en ligne.' });
    expect(await setSiteSwitch(db, { target: 'admin', enabled: false })).toEqual({ ok: false, error: 'Page inconnue.' });
    expect(await setSiteSwitch(db, { target: 'codes', enabled: 'non' })).toEqual({ ok: false, error: 'État manquant.' });
    expect(await listAuditLog(db)).toEqual([]);
  });

  it('efface le journal de plus de 12 mois', async () => {
    await db.insert(schema.adminAuditLog).values([
      { action: 'page_off', target: 'Codes', createdAt: new Date('2025-10-01T10:00:00Z') },
      { action: 'page_on', target: 'Codes', createdAt: new Date('2026-10-01T10:00:00Z') },
    ]);
    expect(await purgeAuditLog(db, new Date('2026-11-03T10:00:00Z'))).toBe(1);
    expect((await listAuditLog(db)).map(entry => entry.action)).toEqual(['page_on']);
  });
});

describe('admin audit display', () => {
  it('dit chaque geste en français, à l’heure de Paris', () => {
    expect(auditLabel('page_off')).toBe('Page coupée :');
    expect(auditLabel('maintenance_on')).toBe('Mode maintenance activé :');
    expect(formatAuditDate('2026-11-03T13:12:00Z')).toMatch(/3 nov\. 2026.*14:12/);
  });
});
