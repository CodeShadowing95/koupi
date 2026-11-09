import { routes } from '@/lib/routes';
import type { Metadata } from 'next';
import { isPublic } from '@/lib/data';
import { getCatalog } from '@/lib/catalog-server';
import { parseFilters } from '@/lib/codes-board';
import { CodesBoard } from '@/components/site/codes-board';
import { VoteInvite } from '@/components/site/vote-invite';
import { ExploreShell } from '@/components/site/explore-shell';

export const metadata: Metadata = {
  title: 'Tous les codes promo · Merkod',
  description: 'Tous les codes promo donnés par les créateurs, vérifiés et reliés à leur source. Filtre par catégorie, outil, créateur, type d’offre ou date de fin.',
  // Les filtres changent l'adresse (?tool=…) : une seule adresse compte pour Google.
  alternates: { canonical: routes.codes },
};

export default async function CodesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ categories, families, codes, tools }, params] = await Promise.all([getCatalog(), searchParams]);
  const live = codes.filter(isPublic);
  const now = Date.now();
  return (
    <ExploreShell codes={live} tools={tools} families={families} now={now} active={{ kind: 'page', page: 'codes' }} skipLabel="Aller aux codes">
      <main className="k-ex-feed k-ex-page" id="contenu">
        <div className="k-ex-head">
          <div>
            <h1>Tous les codes promo</h1>
            <p className="k-ex-lead">Filtre par statut, catégorie, outil, créateur ou date de fin. Clique sur un talon&nbsp;: le code est copié et le site s&apos;ouvre.</p>
          </div>
        </div>
        <CodesBoard
          codes={live}
          tools={tools}
          families={families}
          categories={categories.filter(category => category.count > 0).map(({ slug, name, family }) => ({ slug, name, family }))}
          initial={parseFilters(params)}
          now={now}
        />
      </main>
      <VoteInvite trigger="copy" />
    </ExploreShell>
  );
}
