import { describe, expect, it } from 'vitest';
import { expiryOf, isValidDay, todayInParis } from './code-expiry';

const now = new Date('2026-11-02T10:00:00Z');

describe('todayInParis', () => {
  it('prend le jour à Paris, pas en UTC', () => {
    expect(todayInParis(new Date('2026-11-02T23:30:00Z'))).toBe('2026-11-03');
  });
});

describe('isValidDay', () => {
  it('refuse les dates impossibles ou mal écrites', () => {
    expect(isValidDay('2026-12-31')).toBe(true);
    expect(isValidDay('2026-02-31')).toBe(false);
    expect(isValidDay('31/12/2026')).toBe(false);
  });
});

describe('expiryOf', () => {
  it('ne dit rien sans date', () => {
    expect(expiryOf(null, now)).toEqual({ state: 'none' });
    expect(expiryOf('n’importe quoi', now)).toEqual({ state: 'none' });
  });
  it('affiche la date quand elle est loin', () => {
    expect(expiryOf('2026-12-31', now)).toMatchObject({ state: 'later', label: 'Valable jusqu’au 31 déc. 2026' });
  });
  it('prévient quand elle approche', () => {
    expect(expiryOf('2026-11-05', now)).toMatchObject({ state: 'soon', daysLeft: 3, label: 'Expire dans 3 jours' });
    expect(expiryOf('2026-11-03', now)).toMatchObject({ label: 'Expire dans 1 jour' });
    expect(expiryOf('2026-11-02', now)).toMatchObject({ state: 'today', label: 'Expire aujourd’hui' });
  });
  it('signale une date passée', () => {
    expect(expiryOf('2026-11-01', now)).toMatchObject({ state: 'expired' });
  });
});
