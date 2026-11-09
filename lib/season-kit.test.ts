import { describe, expect, it } from 'vitest';
import { kitCodes, kitDescription, kitKindForSeason, kitKindOf, kitPath, kitTitle, kitYear } from './season-kit';

const code = (over: Partial<Parameters<typeof kitCodes>[0][number]> & { toolSlug: string }) => ({
  status: 'verified' as const, expiresOn: null, discount: '-20 %', success: 50, ...over,
});

describe('kitKindOf', () => {
  it('accepte seulement les saisons connues', () => {
    expect(kitKindOf('black-friday')).toBe('black-friday');
    expect(kitKindOf('noel')).toBe('noel');
    expect(kitKindOf('soldes')).toBeNull();
  });
});

describe('kitKindForSeason', () => {
  it('relie la saison du site au kit', () => {
    expect(kitKindForSeason({ kind: 'black-friday' })).toBe('black-friday');
    expect(kitKindForSeason({ kind: 'christmas' })).toBe('noel');
    expect(kitKindForSeason(null)).toBeNull();
  });
});

describe('kitYear', () => {
  it('garde l’année de Noël jusqu’à l’Épiphanie', () => {
    expect(kitYear('noel', new Date('2027-01-03T10:00:00Z'))).toBe(2026);
    expect(kitYear('black-friday', new Date('2026-11-20T10:00:00Z'))).toBe(2026);
  });
});

describe('kitCodes', () => {
  const now = new Date('2026-11-20T10:00:00Z');
  it('écarte les codes non publiés et expirés', () => {
    const picked = kitCodes([
      code({ toolSlug: 'a', status: 'pending' }),
      code({ toolSlug: 'b', expiresOn: '2026-11-01' }),
      code({ toolSlug: 'c', expiresOn: '2026-12-31' }),
    ], now);
    expect(picked.map(item => item.toolSlug)).toEqual(['c']);
  });
  it('garde le code le plus fiable de chaque outil', () => {
    const picked = kitCodes([code({ toolSlug: 'a', success: 40 }), code({ toolSlug: 'a', success: 90 })], now);
    expect(picked).toHaveLength(1);
    expect(picked[0].success).toBe(90);
  });
  it('met les réductions chiffrées devant', () => {
    const picked = kitCodes([
      code({ toolSlug: 'a', discount: 'Offre spéciale', success: 99 }),
      code({ toolSlug: 'b', discount: '-30 %', success: 10 }),
    ], now);
    expect(picked.map(item => item.toolSlug)).toEqual(['b', 'a']);
  });
});

describe('kitDescription', () => {
  const codes = [
    { tool: 'Surfshark', code: 'YTSTACK', discount: '-86 %' },
    { tool: 'Notion', code: '', discount: '1 mois offert' },
  ];
  it('écrit le lien puis un code par ligne', () => {
    const text = kitDescription({ kind: 'black-friday', year: 2026, url: 'https://merkod.com/creators/x/black-friday', codes });
    expect(text.split('\n')).toEqual([
      '🖤 Black Friday 2026 : tous mes codes promo, vérifiés, au même endroit',
      '👉 https://merkod.com/creators/x/black-friday',
      '',
      '• Surfshark : -86 % avec le code YTSTACK',
      '• Notion : 1 mois offert (lien sur la page)',
    ]);
  });
  it('résume les codes en trop', () => {
    const text = kitDescription({ kind: 'noel', year: 2026, url: 'u', codes, max: 1 });
    expect(text).toContain('🎄 Noël 2026');
    expect(text.endsWith('… et 1 autre sur la page')).toBe(true);
  });
});

describe('titres et adresses', () => {
  it('nomme la saison', () => {
    expect(kitTitle('noel', 2026)).toBe('Mes codes promo de Noël 2026');
    expect(kitPath('lea', 'black-friday')).toBe('/@lea/black-friday');
  });
});
