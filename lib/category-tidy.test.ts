import { describe, expect, it } from 'vitest';
import { tidyCostCents, tidyVerdict } from './category-tidy';
import type { ToolAnalysis } from './tool-analysis';

const categories = [{ slug: 'productivite', name: 'Productivité' }, { slug: 'automatisation', name: 'Automatisation' }];
const analysis = (over: Partial<ToolAnalysis>): ToolAnalysis => ({ summary: 'Un outil.', isOnlineTool: true, categorySlug: '', newCategory: '', reason: 'parce que.', universe: 'outils-en-ligne', toolName: 'Outil', model: 'm', url: 'https://outil.example', ...over });

describe('tidyVerdict', () => {
  it('keeps a tool the AI puts back in its own category', () => {
    expect(tidyVerdict('productivite', analysis({ categorySlug: 'productivite' }), categories)).toEqual({ kind: 'stay' });
  });

  it('moves a tool to another existing category', () => {
    expect(tidyVerdict('productivite', analysis({ categorySlug: 'automatisation' }), categories)).toEqual({ kind: 'move', slug: 'automatisation', reason: 'parce que.' });
  });

  it('proposes a new category when none fits', () => {
    expect(tidyVerdict('productivite', analysis({ newCategory: ' Gestion de mots de passe ' }), categories)).toEqual({ kind: 'create', name: 'Gestion de mots de passe', reason: 'parce que.' });
  });

  it('turns a "new" category that already exists into a move, or a stay', () => {
    expect(tidyVerdict('productivite', analysis({ newCategory: 'automatisation' }), categories)).toEqual({ kind: 'move', slug: 'automatisation', reason: 'parce que.' });
    expect(tidyVerdict('productivite', analysis({ newCategory: 'PRODUCTIVITÉ' }), categories)).toEqual({ kind: 'stay' });
  });

  it('leaves the tool alone when the AI gives nothing', () => {
    expect(tidyVerdict('productivite', analysis({}), categories)).toEqual({ kind: 'unsure' });
  });
});

describe('tidyCostCents', () => {
  it('estimates about 0.1 cent per tool', () => {
    expect(tidyCostCents(12)).toBe(1.2);
    expect(tidyCostCents(0)).toBe(0);
  });
});
