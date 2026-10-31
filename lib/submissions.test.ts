import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { beforeAll, describe, expect, it } from 'vitest';
import type { Db } from '@/db';
import * as schema from '@/db/schema';
import { createSubmission, listSubmissions, moderateSubmission } from './submissions';

// Base Postgres en mémoire (PGlite) avec les vraies migrations du dépôt.
let db: Db;
beforeAll(async () => {
  const pglite = drizzle(new PGlite(), { schema });
  await migrate(pglite, { migrationsFolder: 'db/migrations' });
  db = pglite as unknown as Db;
});

const input = { toolName: 'Hostinger', creatorName: 'Lucas Dev', code: 'LUCAS20', discountLabel: '-20 %', sourceUrl: 'https://youtube.com/watch?v=x', category: 'Hébergement web' };

describe('propositions', () => {
  it('enregistre une proposition en attente', async () => {
    expect(await createSubmission(db, input, 'hash')).toEqual({ status: 'new' });
    const rows = await listSubmissions(db, { status: 'new' });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ toolName: 'Hostinger', code: 'LUCAS20', status: 'new' });
  });

  it('marque en doublon le même outil et le même code, sans tenir compte de la casse', async () => {
    expect(await createSubmission(db, { ...input, toolName: 'hostinger', code: 'lucas20' }, 'hash')).toEqual({ status: 'duplicate' });
  });

  it('refuse un lien source qui n’est pas une URL http(s) au niveau de la base', async () => {
    await expect(createSubmission(db, { ...input, code: 'AUTRE', sourceUrl: 'ftp://x' }, 'hash')).rejects.toThrow();
  });

  it('filtre par catégorie et par date', async () => {
    expect(await listSubmissions(db, { status: 'all', category: 'Hébergement web' })).toHaveLength(2);
    expect(await listSubmissions(db, { status: 'all', category: 'IA' })).toHaveLength(0);
    expect(await listSubmissions(db, { status: 'all', from: '2000-01-01', to: '2000-01-02' })).toHaveLength(0);
  });

  it('applique une décision et la note dans le journal', async () => {
    const [row] = await listSubmissions(db, { status: 'new' });
    expect(await moderateSubmission(db, row.id, 'approve', 'Testé')).toBe('approved');
    const [updated] = await listSubmissions(db, { status: 'approved' });
    expect(updated).toMatchObject({ id: row.id, adminNote: 'Testé' });
    expect(updated.reviewedAt).toBeInstanceOf(Date);
    const logs = await db.select().from(schema.moderationLogs);
    expect(logs).toEqual([expect.objectContaining({ submissionId: row.id, action: 'approve', previousStatus: 'new', nextStatus: 'approved' })]);
  });

  it('renvoie null pour une proposition inconnue', async () => {
    expect(await moderateSubmission(db, '00000000-0000-0000-0000-000000000000', 'reject', null)).toBeNull();
  });
});

describe('filtre de statut', () => {
  it('accepte les statuts connus et refuse le reste', async () => {
    const { isStatusFilter } = await import('./submissions');
    expect(['new', 'approved', 'rejected', 'duplicate', 'all'].every(isStatusFilter)).toBe(true);
    expect(isStatusFilter('xyz')).toBe(false);
    expect(isStatusFilter("new' or 1=1")).toBe(false);
  });
});
