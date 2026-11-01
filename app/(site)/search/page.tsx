import Link from 'next/link';
import { searchTools } from '@/lib/data';
import { getCatalog } from '@/lib/catalog-server';
import { routes } from '@/lib/routes';
import { SearchBar } from '@/components/site/search-bar';
import { ToolCard } from '@/components/site/tool-card';

export default async function SearchResults({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const query = q || '';
  const { tools } = await getCatalog();
  const results = searchTools(tools, query);
  return (
    <main className="k-page">
      <div className="k-wrap">
        <div className="k-page-head">
          <span className="k-eyebrow">Recherche</span>
          <h1>Résultats pour « {query} »</h1>
          <SearchBar tools={tools} initial={query} />
        </div>
        {results.length === 0 ? (
          <div className="k-empty">
            <h2>Aucun outil trouvé.</h2>
            <p>On ne suit pas encore cet outil. Si un créateur a donné un code, propose-le.</p>
            <Link className="k-btn k-btn-paper k-btn-ticket" href={routes.submit()}>Proposer un code</Link>
          </div>
        ) : (
          <div className="k-tool-grid">{results.map(tool => <ToolCard tool={tool} key={tool.slug} />)}</div>
        )}
      </div>
    </main>
  );
}
