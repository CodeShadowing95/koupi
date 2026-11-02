import { describe, expect, it } from 'vitest';
import { codeBadge } from './code-badge';

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
