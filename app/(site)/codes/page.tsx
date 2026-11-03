import type { Metadata } from 'next';
import { isPublic } from '@/lib/data';
import { getCatalog } from '@/lib/catalog-server';
import { parseFilters } from '@/lib/codes-board';
import { CodesBoard } from '@/components/site/codes-board';

export const metadata: Metadata = {
  title: 'Tous les codes · Koupi',
  description: 'Tous les codes promo donnés par les créateurs, vérifiés et reliés à leur source. Filtre par outil, créateur, catégorie, type d’offre ou date de fin.',
};

export default async function CodesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ categories, codes, tools }, params] = await Promise.all([getCatalog(), searchParams]);
  const live = codes.filter(isPublic);
  return (
    <main className="k-page">
      <div className="k-wrap">
        <div className="k-page-head">
          <span className="k-eyebrow">Tous les codes</span>
          <h1>Choisis ton code,<br /><span className="k-grad">détache le talon.</span></h1>
          <p>Chaque code vient d&apos;un créateur, avec sa source et son taux de réussite. Clique sur le talon : le code est copié et le site s&apos;ouvre avec son lien.</p>
        </div>
        <CodesBoard
          codes={live}
          tools={tools}
          categories={categories.filter(category => category.count > 0).map(({ slug, name }) => ({ slug, name }))}
          initial={parseFilters(params)}
          now={Date.now()}
        />
      </div>
    </main>
  );
}
