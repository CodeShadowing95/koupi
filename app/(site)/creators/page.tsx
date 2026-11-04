import type { Metadata } from 'next';
import { getCatalog, getCreatorFacts } from '@/lib/catalog-server';
import { buildDirectory, directoryOptions, parseDirectoryFilter } from '@/lib/creator-directory';
import { routes } from '@/lib/routes';
import { plural } from '@/lib/ui';
import { CreatorsDirectory } from '@/components/site/creators-directory';
import { PageHead } from '@/components/site/page-head';
import { VoteInvite } from '@/components/site/vote-invite';

export const metadata: Metadata = {
  title: 'Les créateurs · Merkod',
  description: 'Les créateurs YouTube, TikTok, Instagram et podcasts qui donnent des codes promo pour des outils en ligne, avec la source de chaque code.',
  alternates: { canonical: routes.creators() },
};

export default async function Creators({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const [catalog, facts] = await Promise.all([getCatalog(), getCreatorFacts()]);
  const all = buildDirectory(catalog, facts);
  const options = directoryOptions(all);

  return (
    <main className="k-page">
      <div className="k-wrap">
        <PageHead
          eyebrow="Créateurs"
          title="Les créateurs"
          lead={<>{plural(all.length, 'créateur donne', 'créateurs donnent')} des codes promo pour des outils en ligne. Chaque code renvoie à la vidéo ou au post d&apos;où il vient.</>}
        />

        <CreatorsDirectory entries={all} options={options} families={catalog.families} initial={parseDirectoryFilter(params, options)} />
      </div>
      <VoteInvite trigger="copy" />
    </main>
  );
}
