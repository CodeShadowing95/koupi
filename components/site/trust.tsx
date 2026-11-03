// Langage de confiance du site public, le même partout : une pastille (coche verte « Vérifié », coche dorée
// « Testé au paiement », sablier « À tester », point d'exclamation « Peut-être expiré ») suivie d'un mot court.
// Sur un logo, la pastille seule (k-codeseal) ; ailleurs, la pastille et le mot (TrustPill).
import type { CodeBadge } from '@/lib/code-badge';

export type TrustSeal = CodeBadge['seal'];

/** Le dessin de la pastille de confiance. */
export function TrustGlyph({ seal }: { seal: TrustSeal }) {
  if (seal === 'to_test') {
    return <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M5 1.5h14v3c0 3.4-3 5.6-4.6 7.5C16 13.9 19 16.1 19 19.5v3H5v-3c0-3.4 3-5.6 4.6-7.5C8 10.1 5 7.9 5 4.5z" /></svg>;
  }
  if (seal === 'expired') {
    return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" aria-hidden="true"><path d="M12 5v9M12 19.5v.01" /></svg>;
  }
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>;
}

/** Pastille + mot. dark : sur le fond nuit ; sinon sur le papier des coupons. */
export function TrustPill({ seal, label, title, dark = false }: { seal: TrustSeal; label: React.ReactNode; title?: string; dark?: boolean }) {
  return (
    <span className={`k-trustpill is-${seal}${dark ? ' is-dark' : ''}`} title={title}>
      <span className={`k-codeseal is-${seal}`} aria-hidden="true"><TrustGlyph seal={seal} /></span>
      {label}
    </span>
  );
}
