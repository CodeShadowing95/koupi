import { describe, expect, it } from 'vitest';
import { salesYear, winterSalesEnd, winterSalesStart } from './sales';

const day = (date: Date) => date.toISOString().slice(0, 10);

describe('winterSalesStart', () => {
  it('prend le deuxième mercredi de janvier quand il tombe au plus tard le 12', () => {
    expect(day(winterSalesStart(2025))).toBe('2025-01-08');
    expect(day(winterSalesStart(2028))).toBe('2028-01-12');
  });

  it('avance au premier mercredi quand le deuxième tombe après le 12', () => {
    expect(day(winterSalesStart(2026))).toBe('2026-01-07');
    expect(day(winterSalesStart(2027))).toBe('2027-01-06');
  });
});

describe('winterSalesEnd', () => {
  it('finit quatre semaines plus tard, un mardi', () => {
    expect(day(winterSalesEnd(2027))).toBe('2027-02-02');
    expect(winterSalesEnd(2027).getUTCDay()).toBe(2);
  });
});

describe('salesYear', () => {
  it('montre les soldes de janvier prochain, puis ceux en cours jusqu’au dernier jour', () => {
    expect(salesYear(new Date('2026-11-10T08:00:00Z'))).toBe(2027);
    expect(salesYear(new Date('2027-01-20T08:00:00Z'))).toBe(2027);
    expect(salesYear(new Date('2027-02-02T22:00:00Z'))).toBe(2027);
    expect(salesYear(new Date('2027-02-03T08:00:00Z'))).toBe(2028);
  });
});
