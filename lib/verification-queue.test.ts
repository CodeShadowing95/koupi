import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { describe, expect, it } from 'vitest';
import type { Db } from '@/db';
import * as schema from '@/db/schema';
import { applyCodeAction, createCode, type CodeInput } from './codes-admin';
import { formatUsd, highlightCode, modelLabel, verdictOf, type QueueItem } from './verification-display';
import { sortQueue, verificationQueue } from './verification-queue';
import { recordVerificationCheck } from './verification-store';

async function freshDb() {
  const db = drizzle(new PGlite(), { schema }) as unknown as Db;
  await migrate(db as never, { migrationsFolder: 'db/migrations' });
  await db.insert(schema.categories).values({ slug: 'vpn', name: 'VPN' });
  await db.insert(schema.tools).values({ slug: 'nordvpn', name: 'NordVPN', categorySlug: 'vpn', website: 'https://nordvpn.com' });
  return db;
}

const base: CodeInput = {
  toolSlug: 'nordvpn', creatorName: 'Ana', code: 'ANA10', discount: '-10 %', sourceUrl: 'https://youtube.com/watch?v=abc123XYZ',
  sourceTitle: '', creatorLink: null, note: null, status: 'pending',
};

async function add(db: Db, input: Partial<CodeInput>) {
  const created = await createCode(db, { ...base, ...input });
  if (!created.ok) throw new Error(created.error);
  return created.data.id;
}

const item = (id: string, createdAt: string, score: number | null): QueueItem => ({
  id, code: id, discount: '', status: 'pending', tool: 't', creator: 'c', sourceUrl: '', sourceTitle: '', votesUp: 0, votesDown: 0, createdAt,
  check: score === null ? null : { score, reasons: [], evidence: null, model: null, costUsdMicros: 0, createdAt },
});

describe('verdictOf', () => {
  it('range le score en rejet proposé, doute ou dossier clair', () => {
    expect(verdictOf(null)).toBe('none');
    expect(verdictOf({ score: 10 })).toBe('reject');
    expect(verdictOf({ score: 40 })).toBe('doubt');
    expect(verdictOf({ score: 60 })).toBe('clear');
  });
});

describe('affichage', () => {
  it('donne un nom court aux modèles', () => {
    expect(modelLabel('claude-haiku-5-5')).toBe('Haiku 5.5');
    expect(modelLabel('claude-opus-5')).toBe('Opus 5');
    expect(modelLabel('autre')).toBe('autre');
    expect(modelLabel(null)).toBe('aucun');
  });
  it('écrit les coûts en dollars', () => {
    expect(formatUsd(8200).replace(/\s/g, ' ')).toBe('0,0082 $');
    expect(formatUsd(1_200_000).replace(/\s/g, ' ')).toBe('1,20 $');
    expect(formatUsd(0).replace(/\s/g, ' ')).toBe('0,00 $');
  });
  it('surligne le code dans l’extrait, sans tenir compte de la casse', () => {
    expect(highlightCode('Code ana10 et ANA10.', 'ANA10')).toEqual([
      { text: 'Code ', match: false }, { text: 'ana10', match: true }, { text: ' et ', match: false }, { text: 'ANA10', match: true }, { text: '.', match: false },
    ]);
  });
});

describe('sortQueue', () => {
  it('met les dossiers analysés devant, du plus sûr au moins sûr, puis les autres du plus ancien', () => {
    const sorted = sortQueue([item('a', '2026-01-03', null), item('b', '2026-01-01', 40), item('c', '2026-01-02', null), item('d', '2026-01-04', 90)]);
    expect(sorted.map(entry => entry.id)).toEqual(['d', 'b', 'c', 'a']);
  });
});

describe('verificationQueue', () => {
  it('liste les codes en attente et à tester avec leur dernière analyse', async () => {
    const db = await freshDb();
    const pending = await add(db, { code: 'ANA10' });
    const toTest = await add(db, { code: 'ANA20', status: 'to_test' });
    const verified = await add(db, { code: 'ANA30', status: 'verified' });
    const archived = await add(db, { code: 'ANA40' });
    await applyCodeAction(db, archived, 'archive');
    await recordVerificationCheck(db, { codeId: pending, score: 30, reasons: [] });
    await new Promise(resolve => setTimeout(resolve, 5));
    await recordVerificationCheck(db, { codeId: pending, score: 85, reasons: [{ points: 40, label: 'Le code figure dans la source.' }], evidence: '… code ANA10 …' });
    await recordVerificationCheck(db, { codeId: verified, score: 90, reasons: [] });

    const queue = await verificationQueue(db);
    expect(queue.map(entry => entry.id)).toEqual([pending, toTest]);
    expect(queue[0]).toMatchObject({ code: 'ANA10', tool: 'NordVPN', creator: 'Ana', status: 'pending', check: { score: 85, evidence: '… code ANA10 …' } });
    expect(queue[1].check).toBeNull();
  });

  it('rend une file vide sans requête de plus', async () => {
    expect(await verificationQueue(await freshDb())).toEqual([]);
  });
});
