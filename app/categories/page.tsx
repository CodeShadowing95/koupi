import Link from 'next/link';
import { categories, tools } from '@/lib/data';

export default function Categories() {
  return (
    <main className="page">
      <div className="container">
        <div className="page-head">
          <span className="eyebrow">Explorer</span>
          <h1>Les catégories</h1>
          <p className="hero-copy">Des outils en ligne utiles, avec les codes des créateurs qui les recommandent.</p>
        </div>
        <div className="category-grid">
          {categories.map(category => <Link className="category-card" href={`/categories/${category.slug}`} key={category.slug}>{category.name} <span>{category.count}</span></Link>)}
        </div>
        <h2 style={{ marginTop: 64, marginBottom: 24 }}>Tous les outils</h2>
        <div className="tool-grid">
          {tools.map(tool => (
            <Link className="tool-card" href={`/outils/${tool.slug}`} key={tool.slug}>
              <div className="tool-card-top"><span className="tool-logo" aria-hidden="true">{tool.name[0].toUpperCase()}</span><div><h3>{tool.name}</h3><p>{tool.category}</p></div></div>
              <div className="tool-card-foot"><span className="muted">{tool.codes} code{tool.codes > 1 ? 's' : ''}</span><span className="text-link" aria-hidden="true">Voir →</span></div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
