import type { Metadata } from 'next';
import { getCatalog } from '@/lib/catalog-server';
import { routes } from '@/lib/routes';
import { bestCodesByFamily, blackFridayDate, cyberMondayDate, frenchDay } from '@/lib/black-friday';
import { PageHead } from '@/components/site/page-head';
import { SeasonCodes } from '@/components/site/season-codes';
import { daysUntil } from '@/lib/season-banner';
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
    <main className="k-page k-season k-season-bf">
      <div className="k-wrap">
        <PageHead
          className="k-season-head"
          eyebrow={daysUntil(friday, now) > 0 ? `J-${daysUntil(friday, now)} · ${frenchDay(friday)}` : `Black Friday ${year()}`}
          title={<>Codes promo <span className="k-season-outline">Black</span> Friday {year()}</>}
          lead={`Le Black Friday ${passed ? 'a eu' : 'a'} lieu le ${frenchDay(friday)}, le Cyber Monday le ${frenchDay(monday)}. Voici le code de créateur le plus fiable pour ${total} outils en ligne, chacun relié à la vidéo d’où il vient.`}
        />
        <p className="k-bf-note">
          Les codes des créateurs ne sont pas des offres Black Friday : ils marchent toute l’année. Pendant le Black Friday,
          compare-les avec la promo affichée par l’outil et garde la meilleure. Un code a marché ? Dis-le avec un pouce,
          ça aide le suivant.
        </p>
        <SeasonCodes groups={groups} idPrefix="bf" />
      </div>
      <VoteInvite trigger="copy" />
    </main>
  );
}
