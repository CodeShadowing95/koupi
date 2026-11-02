import { describe, expect, it } from 'vitest';
import type { Code, Tool } from './data';
import { topCodesFor } from './category-display';

const tool = (slug: string, category: string): Tool => ({ slug, name: slug, category, website: `https://${slug}.com`, description: '', priority: 1, codes: 1 });
const code = (id: string, toolSlug: string, success: number, votes = 10): Code => ({
  id, tool: toolSlug, toolSlug, creator: 'C', creatorSlug: 'c', code: id.toUpperCase(), discount: '-10 %', status: 'verified',
  source: '', sourceTitle: '', votes, success, lastTestedAt: null, paymentTestedAt: null, createdAt: '2026-11-01',
});

const tools = [tool('nord', 'VPN'), tool('surf', 'VPN'), tool('proton', 'VPN'), tool('hostinger', 'Hébergement')];

describe('topCodesFor', () => {
  it('ne garde que les codes des outils de la catégorie', () => {
    const result = topCodesFor('VPN', tools, [code('a', 'nord', 80), code('b', 'hostinger', 99)]);
    expect(result.map(c => c.id)).toEqual(['a']);
  });

  it('classe par taux de réussite puis par votes', () => {
    const result = topCodesFor('VPN', tools, [code('a', 'nord', 70), code('b', 'surf', 90), code('c', 'proton', 90, 50)]);
    expect(result.map(c => c.id)).toEqual(['c', 'b', 'a']);
  });

  it('garde un seul code par outil, le meilleur', () => {
    const result = topCodesFor('VPN', tools, [code('a', 'nord', 60), code('b', 'nord', 95), code('c', 'surf', 80)]);
    expect(result.map(c => c.id)).toEqual(['b', 'c']);
  });

  it('respecte la limite', () => {
    const result = topCodesFor('VPN', tools, [code('a', 'nord', 60), code('b', 'surf', 70), code('c', 'proton', 80)], 2);
    expect(result).toHaveLength(2);
  });

  it('renvoie une liste vide pour une catégorie sans code', () => {
    expect(topCodesFor('IA', tools, [code('a', 'nord', 60)])).toEqual([]);
  });
});
