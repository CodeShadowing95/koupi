import { describe, expect, it } from 'vitest';
import { barcodeBars, couponNumber, hashText } from './coupon-barcode';

describe('hashText', () => {
  it('est stable et distingue deux textes', () => {
    expect(hashText('KOUPI')).toBe(hashText('KOUPI'));
    expect(hashText('KOUPI')).not.toBe(hashText('KOUPA'));
  });
});

describe('couponNumber', () => {
  it('donne 6 chiffres, sans tenir compte de la casse ni des espaces', () => {
    expect(couponNumber('moncode10')).toMatch(/^\d{6}$/);
    expect(couponNumber(' MONCODE10 ')).toBe(couponNumber('moncode10'));
  });
  it('vaut 000000 quand le code est vide', () => {
    expect(couponNumber('   ')).toBe('000000');
  });
});

describe('barcodeBars', () => {
  it('ajoute trois barres par caractère plus les barres de garde', () => {
    expect(barcodeBars('AB').bars).toHaveLength(6 + 6);
  });
  it('dessine un code par défaut quand le champ est vide', () => {
    expect(barcodeBars('').bars).toEqual(barcodeBars('KOUPI').bars);
  });
  it('reste dans sa largeur totale, avec des barres de 1 à 3', () => {
    const { bars, width } = barcodeBars('MONCODE10');
    for (const bar of bars) {
      expect(bar.width).toBeGreaterThanOrEqual(1);
      expect(bar.width).toBeLessThanOrEqual(3);
      expect(bar.x + bar.width).toBeLessThanOrEqual(width);
    }
  });
  it('change quand le code change', () => {
    expect(barcodeBars('MONCODE10').bars).not.toEqual(barcodeBars('MONCODE20').bars);
  });
});
