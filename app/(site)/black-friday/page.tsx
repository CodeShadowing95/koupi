import type { Metadata } from 'next';
import Link from '@/components/site/site-pages';
import { getCatalog } from '@/lib/catalog-server';
import { routes } from '@/lib/routes';
import { bestCodesByFamily, blackFridayDate, cyberMondayDate, frenchDay } from '@/lib/black-friday';
import { PageHead } from '@/components/site/page-head';
import { BoardingCoupon } from '@/components/site/boarding-coupon';
import { VoteInvite } from '@/components/site/vote-invite';

// Page saisonnière à adresse fixe : elle reprend l'année en cours toute seule, Google garde ainsi l'historique de l'adresse.
const year = () => new Date().getUTCFullYear();

export async function generateMetadata(): Promise<Metadata> {
  const title = `Codes promo Black Friday ${year()} : les codes des créateurs · Merkod`;
  const description = `Le meilleur code promo de créateur pour chaque outil en ligne pendant le Black Friday ${year()} : VPN, hébergement, IA, montage… Chaque code est vérifié et relié à la vidéo d’où il vient.`;
  return { title, description, alternates: { canonical: routes.blackFriday }, openGraph: { title, description } };
}

export default async function BlackFriday() {
  const { codes, tools, families } = await getCatalog();
  const now = new Date();
  const friday = blackFridayDate(year());
  const monday = cyberMondayDate(year());
  const passed = now.getTime() > monday.getTime() + 86_400_000;
  const groups = bestCodesByFamily(codes, tools, families, now);
  const total = groups.reduce((sum, group) => sum + group.picks.length, 0);
  return (
    <main className="k-page">
      <div className="k-wrap">
        <PageHead
          eyebrow={`Black Friday ${year()}`}
          title={`Codes promo Black Friday ${year()}`}
          lead={`Le Black Friday ${passed ? 'a eu' : 'a'} lieu le ${frenchDay(friday)}, le Cyber Monday le ${frenchDay(monday)}. Voici le code de créateur le plus fiable pour ${total} outils en ligne, chacun relié à la vidéo d’où il vient.`}
        />
        <p className="k-bf-note">
          Les codes des créateurs ne sont pas des offres Black Friday : ils marchent toute l’année. Pendant le Black Friday,
          compare-les avec la promo affichée par l’outil et garde la meilleure. Un code a marché ? Dis-le avec un pouce,
          ça aide le suivant.
        </p>
        {groups.map(group => (
          <section key={group.family?.slug ?? 'autres'} className="k-search-codes" aria-labelledby={`bf-${group.family?.slug ?? 'autres'}`}>
            <div className="k-search-codes-head">
              <h2 id={`bf-${group.family?.slug ?? 'autres'}`}>{group.family?.name ?? 'Autres outils'}</h2>
              {group.family && <Link className="k-link" href={`${routes.codes}?family=${group.family.slug}`}>Tous les codes {group.family.name} →</Link>}
            </div>
            <ul className="k-pass-grid">
              {group.picks.map(({ code, tool }) => (
                <li key={code.id}><BoardingCoupon code={code} category={tool.category} link={code.creatorLink || tool.website || '#'} /></li>
              ))}
            </ul>
          </section>
        ))}
        {total === 0 && (
          <div className="k-empty">
            <h2>Pas encore de code.</h2>
            <p>Tu as vu un code chez un créateur ? Propose-le, on le vérifie.</p>
            <Link className="k-btn k-btn-paper k-btn-ticket" href={routes.submit()}>Proposer un code</Link>
          </div>
        )}
      </div>
      <VoteInvite trigger="copy" />
    </main>
  );
}
