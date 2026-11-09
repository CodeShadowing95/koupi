// Corps des pages saisonnières (/black-friday, /noel) : le meilleur code de créateur de chaque outil, rangé par famille.
import Link from '@/components/site/site-pages';
import type { BlackFridayGroup } from '@/lib/black-friday';
import { routes } from '@/lib/routes';
import { BoardingCoupon } from './boarding-coupon';

export function SeasonCodes({ groups, idPrefix }: { groups: BlackFridayGroup[]; idPrefix: string }) {
  const total = groups.reduce((sum, group) => sum + group.picks.length, 0);
  if (total === 0) {
    return (
      <div className="k-empty">
        <h2>Pas encore de code.</h2>
        <p>Tu as vu un code chez un créateur ? Propose-le, on le vérifie.</p>
        <Link className="k-btn k-btn-paper k-btn-ticket" href={routes.submit()}>Proposer un code</Link>
      </div>
    );
  }
  return groups.map(group => {
    const id = `${idPrefix}-${group.family?.slug ?? 'autres'}`;
    return (
      <section key={id} className="k-search-codes" aria-labelledby={id}>
        <div className="k-search-codes-head">
          <h2 id={id}>{group.family?.name ?? 'Autres outils'}</h2>
          {group.family && <Link className="k-link" href={routes.explore({ family: group.family.slug })}>Tous les codes {group.family.name} →</Link>}
        </div>
        <ul className="k-pass-grid">
          {group.picks.map(({ code, tool }) => (
            <li key={code.id}><BoardingCoupon code={code} category={tool.category} link={code.creatorLink || tool.website || '#'} /></li>
          ))}
        </ul>
      </section>
    );
  });
}

/** Le bonnet posé sur le mot « Noël » des titres de saison (classe k-season-hatted). */
export function SeasonHat() {
  return <svg viewBox="0 0 120 100" aria-hidden="true"><path d="M14 78 C 30 30, 62 8, 96 22 C 82 30, 80 48, 92 70 Z" fill="#D8343A" /><rect x="6" y="70" width="96" height="22" rx="11" fill="#FFF8EE" /><circle cx="100" cy="24" r="13" fill="#FFF8EE" /></svg>;
}
