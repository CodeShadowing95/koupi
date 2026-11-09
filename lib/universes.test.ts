import { describe, expect, it } from 'vitest';
import type { Catalog, Code, Tool } from './data';
import { DEFAULT_UNIVERSE, isShown, publicCatalog, visibleUniverses } from './universes';

const tool = (slug: string, universe?: string): Tool => ({ slug, name: slug, category: 'c', website: 'https://x.fr', description: '', priority: 3, codes: 1, ...(universe ? { universe } : {}) });
const code = (toolSlug: string, universe?: string) => ({ id: toolSlug, tool: toolSlug, toolSlug, creator: 'a', creatorSlug: 'a', code: 'X', discount: '-10 %', status: 'verified', source: '', sourceTitle: '', votes: 0, success: 0, lastTestedAt: null, paymentTestedAt: null, expiresOn: null, createdAt: '2026-11-01', ...(universe ? { universe } : {}) }) as Code;

const catalog = (universes?: Catalog['universes']): Catalog => ({
  tools: [tool('notion', 'outils-en-ligne'), tool('sephora', 'beaute-et-soins'), tool('ancien')],
  codes: [code('notion', 'outils-en-ligne'), code('sephora', 'beaute-et-soins'), code('ancien')],
  categories: [{ slug: 'notes', name: 'Notes', family: 'productivite', count: 1, tracked: 1, universe: 'outils-en-ligne' }, { slug: 'beaute-et-soins', name: 'Beauté et soins', family: 'beaute-et-soins', count: 1, tracked: 1, universe: 'beaute-et-soins' }],
  families: [{ slug: 'productivite', name: 'Productivité', universe: 'outils-en-ligne' }, { slug: 'beaute-et-soins', name: 'Beauté et soins', universe: 'beaute-et-soins' }],
  tracked: 3,
  ...(universes ? { universes } : {}),
});

const starting = [{ slug: 'outils-en-ligne', name: 'Outils en ligne', visible: true }, { slug: 'beaute-et-soins', name: 'Beauté et soins', visible: false }];

describe('visibleUniverses', () => {
  it('garde les univers allumés', () => expect([...visibleUniverses(starting)]).toEqual(['outils-en-ligne']));
  it('sans liste, seul l’univers par défaut existe', () => expect([...visibleUniverses(undefined)]).toEqual([DEFAULT_UNIVERSE]));
});

describe('isShown', () => {
  it('un élément sans univers est dans « Outils en ligne »', () => expect(isShown({}, new Set([DEFAULT_UNIVERSE]))).toBe(true));
  it('un univers éteint est caché', () => expect(isShown({ universe: 'mode' }, new Set([DEFAULT_UNIVERSE]))).toBe(false));
});

describe('publicCatalog', () => {
  it('retire outils, codes, catégories et familles des univers cachés', () => {
    const shown = publicCatalog(catalog(starting));
    expect(shown.tools.map(item => item.slug)).toEqual(['notion', 'ancien']);
    expect(shown.codes.map(item => item.toolSlug)).toEqual(['notion', 'ancien']);
    expect(shown.categories.map(item => item.slug)).toEqual(['notes']);
    expect(shown.families.map(item => item.slug)).toEqual(['productivite']);
  });
  it('montre un univers dès qu’il est allumé', () => {
    const shown = publicCatalog(catalog(starting.map(universe => ({ ...universe, visible: true }))));
    expect(shown.tools).toHaveLength(3);
  });
  it('un ancien catalogue sans univers ne montre que les outils en ligne', () => {
    expect(publicCatalog(catalog()).tools.map(item => item.slug)).toEqual(['notion', 'ancien']);
  });
});
