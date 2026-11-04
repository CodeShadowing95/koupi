import type { Code } from '@/lib/data';
import { codeBadge, expiryNote } from '@/lib/code-badge';
import { TrustPill } from '@/components/site/trust';

type BadgeCode = Pick<Code, 'status' | 'lastTestedAt' | 'paymentTestedAt' | 'expiresOn'>;

/** Confiance d'un code (Testé au paiement, Vérifié, À tester, Peut-être expiré), suivie de sa date de fin s'il en a une. */
export function CodeBadge({ code, dark = false, withDate = true }: { code: BadgeCode; dark?: boolean; withDate?: boolean }) {
  const badge = codeBadge(code, { withDate });
  const expiry = expiryNote(code.expiresOn);
  const dk = dark ? ' is-dark' : '';
  return (
    <>
      <TrustPill seal={badge.seal} label={badge.label} title={badge.title} dark={dark} />
      {expiry && <span className={`k-status ${expiry.tone === 'warn' ? 'k-status-warn' : 'k-status-plain'}${dk}`} title="Date de fin donnée par le créateur">{expiry.label}</span>}
    </>
  );
}
