import { describe, expect, it } from 'vitest';
import { compareYield, isQuiet, yieldScore } from './podcast-yield';

const now = new Date('2026-11-05T12:00:00Z');
const daysAgo = (days: number) => new Date(now.getTime() - days * 86_400_000).toISOString();
const podcast = (title: string, extra: Partial<{ codesFound: number; codesPublished: number; copiesThisMonth: number }> = {}) =>
  ({ title, createdAt: daysAgo(200), lastCodeAt: null, codesFound: 0, codesPublished: 0, copiesThisMonth: 0, ...extra });

describe('isQuiet', () => {
  it('rien depuis 90 jours, pour un podcast suivi depuis au moins 90 jours', () => {
    expect(isQuiet({ createdAt: daysAgo(120), lastCodeAt: null }, now)).toBe(true);
    expect(isQuiet({ createdAt: daysAgo(120), lastCodeAt: daysAgo(100) }, now)).toBe(true);
    expect(isQuiet({ createdAt: daysAgo(120), lastCodeAt: daysAgo(10) }, now)).toBe(false);
    // Suivi récemment : on lui laisse le temps.
    expect(isQuiet({ createdAt: daysAgo(20), lastCodeAt: null }, now)).toBe(false);
  });
});

describe('rendement', () => {
  it('classe par copies, puis codes publiés, puis codes trouvés, puis nom', () => {
    const list = [podcast('B'), podcast('A'), podcast('Trouvés', { codesFound: 3 }), podcast('Publiés', { codesFound: 1, codesPublished: 1 }), podcast('Copiés', { copiesThisMonth: 2 })];
    expect([...list].sort(compareYield).map(item => item.title)).toEqual(['Copiés', 'Publiés', 'Trouvés', 'A', 'B']);
    expect(yieldScore({ copiesThisMonth: 1, codesPublished: 0, codesFound: 0 })).toBeGreaterThan(yieldScore({ copiesThisMonth: 0, codesPublished: 999, codesFound: 999 }));
  });
});
