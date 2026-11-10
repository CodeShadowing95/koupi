import type { Metadata } from 'next';
import { getCatalog } from '@/lib/catalog-server';
import { routes } from '@/lib/routes';
import { bestCodesByFamily, frenchDay } from '@/lib/black-friday';
import { salesYear, winterSalesEnd, winterSalesStart } from '@/lib/sales';
import { PageHead } from '@/components/site/page-head';
import { SeasonCodes } from '@/components/site/season-codes';
import { daysUntil } from '@/lib/season-banner';
import { VoteInvite } from '@/components/site/vote-invite';

// Page saisonnière à adresse fixe, comme /black-friday et /noel : elle passe toute seule aux soldes suivants
// le lendemain de leur dernier jour.
export async function generateMetadata(): Promise<Metadata> {
  const year = salesYear(new Date());
  const title = `Codes promo soldes d’hiver ${year} : les codes des créateurs · Merkod`;
  const description = `Pendant les soldes d’hiver ${year}, le meilleur code promo de créateur pour chaque outil en ligne : VPN, hébergement, IA, montage… Chaque code est vérifié et relié à la vidéo d’où il vient.`;
  return { title, description, alternates: { canonical: routes.sales }, openGraph: { title, description } };
}

/** « mardi 2 février » : la fin des soldes, sans l'année déjà dite. */
const shortDay = (date: Date) => new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(date);

export default async function Sales() {
  const { codes, tools, families } = await getCatalog();
  const now = new Date();
  const year = salesYear(now);
  const start = winterSalesStart(year);
  const end = winterSalesEnd(year);
  const left = daysUntil(start, now);
  const groups = bestCodesByFamily(codes, tools, families, now);
  const total = groups.reduce((sum, group) => sum + group.picks.length, 0);
  return (
    <main className="k-page k-season k-season-sales">
      <div className="k-wrap">
        <PageHead
          className="k-season-head"
          eyebrow={left > 0 ? `J-${left} · Soldes d’hiver ${year}` : `En cours · Soldes d’hiver ${year}`}
          title={<>Codes promo des <span className="k-season-tag">soldes</span> d’hiver {year}</>}
          lead={`Les soldes d’hiver ${left > 0 ? 'commencent' : 'ont commencé'} le ${frenchDay(start)} à 8 h et durent quatre semaines, jusqu’au ${shortDay(end)}, dans la plupart des départements. Voici le code de créateur le plus fiable pour ${total} outils en ligne, chacun relié à la vidéo d’où il vient.`}
        />
        <p className="k-bf-note">
          Les soldes concernent surtout les boutiques : les outils en ligne en font rarement. Les codes des créateurs, eux,
          marchent toute l’année. Si un outil affiche une promo pendant les soldes, compare-la avec le code et garde la
          meilleure. Un code a marché ? Dis-le avec un pouce, ça aide le suivant.
        </p>
        <SeasonCodes groups={groups} idPrefix="soldes" />
      </div>
      <VoteInvite trigger="copy" />
    </main>
  );
}
