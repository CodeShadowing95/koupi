import { describe, expect, it } from 'vitest';
import { christmasDate, christmasYear } from './christmas';
import { frenchDay } from './black-friday';

describe('christmasYear', () => {
  it('garde le Noël passé jusqu’à l’Épiphanie, puis passe au suivant', () => {
    expect(christmasYear(new Date('2026-11-09T10:00:00Z'))).toBe(2026);
    expect(christmasYear(new Date('2026-12-31T22:00:00Z'))).toBe(2026);
    expect(christmasYear(new Date('2027-01-06T10:00:00Z'))).toBe(2026);
    expect(christmasYear(new Date('2027-01-07T10:00:00Z'))).toBe(2027);
  });

  it('donne le jour de Noël', () => {
    expect(frenchDay(christmasDate(2026))).toBe('vendredi 25 décembre 2026');
  });
});
