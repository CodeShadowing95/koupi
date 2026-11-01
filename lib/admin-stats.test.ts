import { describe, expect, it } from 'vitest';
import type { Category, Code } from './data';
import { coverageByCategory, flaggedCodes, overview, reliabilityBuckets, todos, topTools, weightedSuccess } from './admin-stats';

const code = (over: Partial<Code>): Code => ({
  id: over.code ?? 'X', tool: 'Abby', creator: 'Créa', code: 'X', discount: '-10 %', status: 'to_test',
  source: 'https://youtube.com/watch?v=x', sourceTitle: 'Vidéo', votes: 0, success: 0, ...over,
});

const codes: Code[] = [
  code({ code: 'A1', tool: 'Abby', creator: 'Ana', status: 'verified', votes: 10, success: 90 }),
  code({ code: 'A2', tool: 'Abby', creator: 'Bob', status: 'to_test', votes: 2, success: 0 }),
  code({ code: 'B1', tool: 'Brevo', creator: 'Ana', status: 'to_test', votes: 4, success: 75 }),
  code({ code: 'C1', tool: 'Canva', creator: 'Cléo', status: 'pending' }),
  code({ code: 'D1', tool: 'Divi', creator: 'Dan', status: 'rejected', votes: 1, success: 0 }),
];
const categories: Category[] = [
  { slug: 'finance', name: 'Finance', count: 1, tracked: 2 },
  { slug: 'marketing', name: 'Marketing', count: 1, tracked: 4 },
  { slug: 'ia', name: 'IA', count: 0, tracked: 3 },
];
const catalog = { codes, tools: [], categories, tracked: 10 };

describe('indicateurs du catalogue', () => {
  it('compte les statuts, la couverture et la part de codes vérifiés', () => {
    const stats = overview(catalog);
    expect(stats.counts).toEqual({ pending: 1, to_test: 2, verified: 1, rejected: 1 });
    expect(stats.visible).toBe(3);
    expect(stats.coveredTools).toBe(2);
    expect(stats.coverage).toBe(20);
    expect(stats.verifiedRate).toBe(33);
    expect(stats.creators).toBe(2);
    expect(stats.emptyCategories.map(category => category.slug)).toEqual(['ia']);
  });

  it('pondère la réussite par le nombre de votes', () => {
    // (10×90 + 2×0 + 4×75 + 1×0) / 17 = 70,6
    expect(weightedSuccess(codes)).toEqual({ rate: 71, votes: 17, votedCodes: 4 });
    expect(weightedSuccess([code({})]).rate).toBeNull();
  });

  it('signale seulement les codes visibles votés au moins deux fois et sous 50 %', () => {
    expect(flaggedCodes(codes).map(item => item.code)).toEqual(['A2']);
  });

  it('classe les catégories de la mieux couverte à la moins couverte', () => {
    expect(coverageByCategory(categories).map(item => [item.slug, item.rate])).toEqual([['finance', 50], ['marketing', 25], ['ia', 0]]);
  });

  it('classe les outils par nombre de codes visibles', () => {
    expect(topTools(codes)).toEqual([{ tool: 'Abby', count: 2 }, { tool: 'Brevo', count: 1 }]);
  });

  it('range les codes votés par niveau de fiabilité', () => {
    expect(reliabilityBuckets(codes)).toEqual({ low: 2, mid: 1, high: 1 });
  });
});

describe('actions du jour', () => {
  it('met les propositions et les codes signalés en premier', () => {
    expect(todos(catalog, 3).map(todo => todo.id)).toEqual(['submissions', 'flag-A2', 'to-test', 'pending', 'empty-categories']);
  });

  it('ne parle pas des propositions quand la file est vide ou inconnue', () => {
    expect(todos(catalog, 0).map(todo => todo.id)).not.toContain('submissions');
    expect(todos(catalog, null).map(todo => todo.id)).not.toContain('submissions');
  });

  it('accorde les phrases au singulier', () => {
    expect(todos(catalog, 1)[0].title).toBe('Répondre à 1 proposition de visiteurs');
    expect(todos(catalog, 1).find(todo => todo.id === 'pending')?.title).toBe('Trancher 1 code en attente');
  });
});
