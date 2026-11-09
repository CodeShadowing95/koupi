import type { Metadata } from 'next';
import { getCatalog, getCreatorFacts } from '@/lib/catalog-server';
import { buildDirectory, directoryOptions, parseDirectoryFilter } from '@/lib/creator-directory';
import { routes } from '@/lib/routes';
import { plural } from '@/lib/ui';
import { CreatorsDirectory } from '@/components/site/creators-directory';
import { ExploreShell } from '@/components/site/explore-shell';
import { isPublic } from '@/lib/data';
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
    <ExploreShell codes={catalog.codes.filter(isPublic)} tools={catalog.tools} families={catalog.families} now={Date.now()} active={{ kind: 'page', page: 'creators' }} skipLabel="Aller aux créateurs">
      <main className="k-ex-feed k-ex-page" id="contenu">
        <div className="k-ex-head">
          <div>
            <h1>Les créateurs</h1>
            <p className="k-ex-lead">{plural(all.length, 'créateur donne', 'créateurs donnent')} des codes promo pour des outils en ligne. Chaque code renvoie à la vidéo ou au post d&apos;où il vient.</p>
          </div>
        </div>
        <CreatorsDirectory entries={all} options={options} families={catalog.families} initial={parseDirectoryFilter(params, options)} />
      </main>
      <VoteInvite trigger="copy" />
    </ExploreShell>
  );
}
