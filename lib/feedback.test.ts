import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Db } from '@/db';
import * as schema from '@/db/schema';
import { countNewFeedback, createFeedback, listFeedback, parseFeedback, updateFeedback } from './feedback';

describe('avis envoyé par un visiteur', () => {
  it('demande un type et un message, l’e-mail est facultatif', () => {
    expect(parseFeedback({ kind: 'idea', message: '  Un mode sombre ?  ' })).toEqual({ ok: true, data: { kind: 'idea', message: 'Un mode sombre ?', email: null, fromPath: null } });
    expect(parseFeedback({ kind: 'avis', message: 'Bonjour' }).ok).toBe(false);
    expect(parseFeedback({ kind: 'remark', message: 'ok' }).ok).toBe(false);
    expect(parseFeedback({ kind: 'remark', message: 'Très bien', email: 'pas-un-mail' }).ok).toBe(false);
  });

  it('ne garde que le chemin d’une page du site comme provenance', () => {
    const from = (fromPath: string) => { const result = parseFeedback({ kind: 'problem', message: 'Le bouton ne marche pas', fromPath }); return result.ok ? result.data.fromPath : 'refusé'; };
    expect(from('/tools/notion')).toBe('/tools/notion');
    expect(from('https://evil.example/x')).toBeNull();
    expect(from('//evil.example')).toBeNull();
    expect(from('/codes?q=<script>')).toBeNull();
  });
});

describe('avis en base', () => {
  let db: Db;
  beforeEach(async () => {
    const pglite = drizzle(new PGlite(), { schema });
    await migrate(pglite, { migrationsFolder: 'db/migrations' });
    db = pglite as unknown as Db;
  });

  it('enregistre un avis, le compte comme nouveau puis le traite', async () => {
    const { id } = await createFeedback(db, { kind: 'idea', message: 'Des alertes par e-mail', email: 'ana@exemple.fr', fromPath: '/codes' }, 'hash');
    expect(await countNewFeedback(db)).toBe(1);
    const [item] = await listFeedback(db);
    expect(item).toMatchObject({ id, kind: 'idea', status: 'new', email: 'ana@exemple.fr', fromPath: '/codes' });
    expect(item).not.toHaveProperty('ipHash');

    expect(await updateFeedback(db, id, { status: 'done', adminNote: 'Prévu' }, new Date('2026-11-04T10:00:00Z'))).toEqual({ ok: true, data: { id } });
    const [done] = await listFeedback(db);
    expect(done).toMatchObject({ status: 'done', adminNote: 'Prévu', handledAt: '2026-11-04T10:00:00.000Z' });
    expect(await countNewFeedback(db)).toBe(0);
    expect((await updateFeedback(db, id, { status: 'archived' })).ok).toBe(false);
    expect((await updateFeedback(db, '00000000-0000-0000-0000-000000000000', { status: 'read' })).ok).toBe(false);
  });
});
