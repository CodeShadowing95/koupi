'use client';
import { useRouter } from 'next/navigation';
import { backTarget } from '@/lib/back-link';
import { routes } from '@/lib/routes';

/** « Retour » de la page d'un code : la page d'avant sur Merkod, sinon la page principale. */
export function BackButton() {
  const router = useRouter();
  const goBack = () => {
    if (backTarget(document.referrer, window.location.origin, window.history.length) === 'history') router.back();
    else router.push(routes.home);
  };
  return (
    <button type="button" className="k-back" onClick={goBack}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5M11 18l-6-6 6-6" /></svg>
      Retour
    </button>
  );
}
