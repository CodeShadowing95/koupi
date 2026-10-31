import Link from 'next/link';
import { notFound } from 'next/navigation';
import { categories, codes, tools } from '@/lib/data';

export default function Category({ params }: { params: { slug: string } }) {
  const category = categories.find(item => item.slug === params.slug);
  if (!category) notFound();
  const categoryTools = tools.filter(tool => tool.category === category.name);
  return (
    <main className="page">
      <div className="container">
        <Link className="back" href="/categories">← Toutes les catégories</Link>
        <div className="page-head">
          <span className="eyebrow">Catégorie</span>
          <h1>{category.name}</h1>
          <p className="hero-copy">Compare les codes des créateurs pour les outils de cette catégorie.</p>
        </div>
        {categoryTools.length === 0 ? (
          <div className="empty"><h2>Pas encore d&apos;outil ici.</h2><p>Tu connais un code pour un outil de cette catégorie ?</p><Link className="btn b-ink" href="/proposer">Proposer un code</Link></div>
        ) : (
          <div className="code-list">
            {categoryTools.map(tool => {
              const code = codes.find(item => item.tool === tool.name && item.status !== 'pending');
              return (
                <article className="code-card" key={tool.slug}>
                  <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                    <span className="tool-logo" aria-hidden="true">{tool.name[0].toUpperCase()}</span>
                    <div><h3>{tool.name}</h3><p>{tool.description}</p></div>
                  </div>
                  <div>{code ? <><span className="code-pill">{code.code}</span><p style={{ marginTop: 8 }}>{code.discount} · le code de {code.creator}</p></> : <span className="muted">Aucun code public</span>}</div>
                  <Link className="btn b-out" href={`/outils/${tool.slug}`}>Voir les codes</Link>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
