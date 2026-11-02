import type { Code } from '@/lib/data';
import { codeBadge, expiryNote } from '@/lib/code-badge';

type BadgeCode = Pick<Code, 'status' | 'lastTestedAt' | 'paymentTestedAt' | 'expiresOn'>;

/** Badge de confiance d'un code (Testé au paiement, Source vérifiée, À tester), suivi de sa date de fin s'il en a une. */
export function CodeBadge({ code, dark = false, withDate = true }: { code: BadgeCode; dark?: boolean; withDate?: boolean }) {
  const badge = codeBadge(code, { withDate });
  const expiry = expiryNote(code.expiresOn);
  const dk = dark ? ' is-dark' : '';
  return (
    <>
      <span className={`k-status k-status-${badge.tone}${dk}`} title={badge.title}>{badge.label}</span>
      {expiry && <span className={`k-status ${expiry.tone === 'warn' ? 'k-status-warn' : 'k-status-plain'}${dk}`} title="Date de fin donnée par le créateur">{expiry.label}</span>}
    </>
  );
}
