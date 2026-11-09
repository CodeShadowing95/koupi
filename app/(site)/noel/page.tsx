import type { Metadata } from 'next';
import { getCatalog } from '@/lib/catalog-server';
import { routes } from '@/lib/routes';
import { bestCodesByFamily, frenchDay } from '@/lib/black-friday';
import { christmasDate, christmasYear } from '@/lib/christmas';
import { PageHead } from '@/components/site/page-head';
import { SeasonCodes } from '@/components/site/season-codes';
import { daysUntil } from '@/lib/season-banner';
import { VoteInvite } from '@/components/site/vote-invite';

// Page saisonnière à adresse fixe, comme /black-friday : elle passe toute seule au Noël suivant après l'Épiphanie.
export async function generateMetadata(): Promise<Metadata> {
  const year = christmasYear(new Date());
  const title = `Codes promo Noël ${year} : les codes des créateurs · Merkod`;
  const description = `Pour offrir un abonnement ou t’équiper pour l’année : le meilleur code promo de créateur pour chaque outil en ligne à Noël ${year}. Chaque code est vérifié et relié à la vidéo d’où il vient.`;
  return { title, description, alternates: { canonical: routes.christmas }, openGraph: { title, description } };
}

export default async function Christmas() {
  const { codes, tools, families } = await getCatalog();
  const now = new Date();
  const year = christmasYear(now);
  const groups = bestCodesByFamily(codes, tools, families, now);
  const total = groups.reduce((sum, group) => sum + group.picks.length, 0);
  return (
    <main className="k-page k-season k-season-xmas">
      <div className="k-wrap">
        <PageHead
          className="k-season-head"
          eyebrow={daysUntil(christmasDate(year), now) > 0 ? `J-${daysUntil(christmasDate(year), now)} · Noël ${year}` : `Noël ${year}`}
          title={<>Codes promo de <span className="k-season-hatted">Noël<svg viewBox="0 0 120 100" aria-hidden="true"><path d="M14 78 C 30 30, 62 8, 96 22 C 82 30, 80 48, 92 70 Z" fill="#D8343A" /><rect x="6" y="70" width="96" height="22" rx="11" fill="#FFF8EE" /><circle cx="100" cy="24" r="13" fill="#FFF8EE" /></svg></span> {year}</>}
          lead={`Noël tombe le ${frenchDay(christmasDate(year))}. Pour offrir un abonnement ou bien démarrer l’année, voici le code de créateur le plus fiable pour ${total} outils en ligne, chacun relié à la vidéo d’où il vient.`}
        />
        <p className="k-bf-note">
          Les codes des créateurs marchent toute l’année, pas seulement à Noël. Pour offrir un outil, regarde sur son site
          s’il vend une carte cadeau ou un abonnement à offrir, puis applique le code au paiement. Un code a marché ?
          Dis-le avec un pouce, ça aide le suivant.
        </p>
        <SeasonCodes groups={groups} idPrefix="noel" />
      </div>
      <VoteInvite trigger="copy" />
    </main>
  );
}
