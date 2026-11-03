import { describe, expect, it } from 'vitest';
import { codeBadge, expiryNote } from './code-badge';

const at = '2026-11-02T10:00:00.000Z';

describe('codeBadge', () => {
  it('montre le test au paiement en priorité, avec sa date', () => {
    expect(codeBadge({ status: 'verified', lastTestedAt: at, paymentTestedAt: at })).toMatchObject({ tone: 'ok', label: '✓ Testé au paiement le 2 nov. 2026' });
  });
  it('montre la source vérifiée, datée quand on connaît la date', () => {
    expect(codeBadge({ status: 'verified', lastTestedAt: at, paymentTestedAt: null }).label).toBe('✓ Source vérifiée le 2 nov. 2026');
    expect(codeBadge({ status: 'verified', lastTestedAt: null, paymentTestedAt: null }).label).toBe('✓ Source vérifiée');
  });
  it('peut se passer de la date dans les listes', () => {
    expect(codeBadge({ status: 'verified', lastTestedAt: at, paymentTestedAt: at }, { withDate: false }).label).toBe('✓ Testé au paiement');
  });
  it('ignore un vieux test au paiement sur un code à tester', () => {
    expect(codeBadge({ status: 'to_test', lastTestedAt: null, paymentTestedAt: at })).toMatchObject({ tone: 'warn', label: '◷ À tester' });
  });
});

describe('pastille du logo', () => {
  it('suit le même ordre que le badge : expiré, payé, vérifié, à tester', () => {
    const now = new Date('2026-11-02T10:00:00Z');
    expect(codeBadge({ status: 'verified', lastTestedAt: at, paymentTestedAt: at, expiresOn: '2026-11-01' }, { now }).seal).toBe('expired');
    expect(codeBadge({ status: 'verified', lastTestedAt: at, paymentTestedAt: at }).seal).toBe('paid');
    expect(codeBadge({ status: 'verified', lastTestedAt: at, paymentTestedAt: null }).seal).toBe('verified');
    expect(codeBadge({ status: 'to_test', lastTestedAt: null, paymentTestedAt: at }).seal).toBe('to_test');
  });
});

describe('date de fin', () => {
  const now = new Date('2026-11-02T10:00:00Z');
  it('ne présente plus comme vérifié un code dont la date est passée', () => {
    expect(codeBadge({ status: 'verified', lastTestedAt: at, paymentTestedAt: at, expiresOn: '2026-11-01' }, { now })).toMatchObject({ tone: 'warn', label: '◷ Peut-être expiré' });
  });
  it('donne une ligne neutre, puis un avertissement quand la date approche', () => {
    expect(expiryNote('2026-12-31', now)).toMatchObject({ tone: 'neutral', label: 'Valable jusqu’au 31 déc. 2026' });
    expect(expiryNote('2026-11-04', now)).toMatchObject({ tone: 'warn', label: 'Expire dans 2 jours' });
    expect(expiryNote(null, now)).toBeNull();
    expect(expiryNote('2026-10-01', now)).toBeNull();
  });
});
