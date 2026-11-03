import Link from '@/components/site/site-pages';
import { searchCodes, searchCreators, searchTools } from '@/lib/data';
import { getCatalog, getCreatorFacts } from '@/lib/catalog-server';
import { buildDirectory } from '@/lib/creator-directory';
import { CreatorAvatar } from '@/components/site/creator-avatar';
import { CreatorMark } from '@/components/site/creator-mark';
import { getDb } from '@/db';
import { bumpCounter, normalizeQuery } from '@/lib/audience';
import { routes } from '@/lib/routes';
import { SearchBar } from '@/components/site/search-bar';
import { ToolCard } from '@/components/site/tool-card';
import { PageHead } from '@/components/site/page-head';
import { BoardingCoupon } from '@/components/site/boarding-coupon';

/** Coupons montrés dans les résultats ; au-delà, un lien vers la page Codes filtrée. */
const CODES_SHOWN = 6;

export const metadata = { title: 'Recherche · Koupi', robots: { index: false, follow: true } };

export default async function SearchResults({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const query = q || '';
  const catalog = await getCatalog();
  const { tools } = catalog;
  const results = searchTools(tools, query);
  const codes = searchCodes(catalog.codes, tools, query);
  const toolBySlug = new Map(tools.map(tool => [tool.slug, tool]));
  const creators = searchCreators(buildDirectory(catalog, await getCreatorFacts()), query).slice(0, 12);
  // Recherche sans résultat : on compte la demande (anonyme), elle dit quel outil suivre ensuite.
  const counted = normalizeQuery(query);
  if (results.length === 0 && creators.length === 0 && codes.length === 0 && counted.length >= 2) await bumpCounter(getDb(), 'search_empty', counted).catch(error => console.error('search counter failed', error));
  return (
    <main className="k-page">
      <div className="k-wrap">
        <PageHead eyebrow="Recherche" title={query ? <>Résultats pour « {query} »</> : 'Recherche'}>
          <SearchBar tools={tools} initial={query} />
        </PageHead>
        {codes.length > 0 && (
          <section className="k-search-codes" aria-labelledby="search-codes">
            <div className="k-search-codes-head">
              <h2 id="search-codes">Codes</h2>
              {codes.length > CODES_SHOWN && (
                <Link className="k-link" href={`${routes.codes}?q=${encodeURIComponent(query)}`}>Voir les {codes.length} codes →</Link>
              )}
            </div>
            <ul className="k-pass-grid">
              {codes.slice(0, CODES_SHOWN).map(code => {
                const tool = toolBySlug.get(code.toolSlug);
                return <li key={code.id}><BoardingCoupon code={code} category={tool?.category} link={code.creatorLink || tool?.website || '#'} /></li>;
              })}
            </ul>
          </section>
        )}
        {creators.length > 0 && (
          <section className="k-search-creators" aria-labelledby="search-creators">
            <h2 id="search-creators">Créateurs</h2>
            <ul className="k-creator-accounts">
              {creators.map(creator => (
                <li key={creator.slug}>
                  <Link className="k-chip" href={routes.creator(creator.slug)}>
                    <CreatorAvatar name={creator.name} size="xs" />{creator.name}<CreatorMark level={creator.level} compact /><small>{creator.codes} code{creator.codes > 1 ? 's' : ''}</small>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
        {results.length === 0 && (creators.length > 0 || codes.length > 0) ? null : results.length === 0 ? (
          <div className="k-empty">
            <h2>Aucun code trouvé.</h2>
            <p>On ne suit pas encore cet outil. Si un créateur a donné un code, propose-le.</p>
            <Link className="k-btn k-btn-paper k-btn-ticket" href={routes.submit()}>Proposer un code</Link>
          </div>
        ) : (
          <section className="k-search-tools" aria-labelledby="search-tools">
            <h2 id="search-tools">Outils</h2>
            <div className="k-tool-grid">{results.map(tool => <ToolCard tool={tool} key={tool.slug} />)}</div>
          </section>
        )}
      </div>
    </main>
  );
}
