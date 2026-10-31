import Link from 'next/link';
import { Search } from '@/components/search';
import { searchTools } from '@/lib/data';

export default function SearchResults({ searchParams }: { searchParams: { q?: string } }) {
  const query = searchParams.q || '';
  const results = searchTools(query);
  return (
    <main className="page">
      <div className="container">
        <div className="page-head">
          <span className="eyebrow">Recherche</span>
          <h1>Résultats pour « {query} »</h1>
          <Search />
        </div>
        {results.length === 0 ? (
          <div className="empty">
            <h2>Aucun outil trouvé.</h2>
            <p>On ne suit pas encore cet outil. Si un créateur a donné un code, propose-le.</p>
            <Link className="btn b-ink" href="/proposer">Proposer un code</Link>
          </div>
        ) : (
          <div className="tool-grid">
            {results.map(tool => (
              <Link className="tool-card" href={`/outils/${tool.slug}`} key={tool.slug}>
                <div className="tool-card-top"><span className="tool-logo" aria-hidden="true">{tool.name[0].toUpperCase()}</span><div><h3>{tool.name}</h3><p>{tool.category}</p></div></div>
                <div className="tool-card-foot"><span className="muted">{tool.codes} code{tool.codes > 1 ? 's' : ''}</span><span className="text-link" aria-hidden="true">Voir →</span></div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
