import type { Metadata } from 'next';
import { isPublic } from '@/lib/data';
import { getCatalog } from '@/lib/catalog-server';
import { parseFilters } from '@/lib/codes-board';
import { CodesBoard } from '@/components/site/codes-board';
import { VoteInvite } from '@/components/site/vote-invite';

export const metadata: Metadata = {
  title: 'Tous les codes promo · Merkod',
  description: 'Tous les codes promo donnés par les créateurs, vérifiés et reliés à leur source. Filtre par catégorie, outil, créateur, type d’offre ou date de fin.',
};

export default async function CodesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ categories, families, codes, tools }, params] = await Promise.all([getCatalog(), searchParams]);
  const live = codes.filter(isPublic);
  return (
    <main className="k-page">
      <div className="k-wrap">
        <div className="k-codes-head">
          <h1>Tous les codes promo</h1>
          <p>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M20 4 8.1 15.9M14.5 14.5 20 20M8.1 8.1 12 12" /></svg>
            Clique sur un talon&nbsp;: le code est copié et le site s&apos;ouvre.
          </p>
        </div>
        <CodesBoard
          codes={live}
          tools={tools}
          families={families}
          categories={categories.filter(category => category.count > 0).map(({ slug, name, family }) => ({ slug, name, family }))}
          initial={parseFilters(params)}
          now={Date.now()}
        />
      </div>
      <VoteInvite trigger="copy" />
    </main>
  );
}
