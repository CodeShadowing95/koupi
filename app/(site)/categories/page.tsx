import Link from 'next/link';
import { categories, tools } from '@/lib/data';
import { routes } from '@/lib/routes';
import { ToolCard } from '@/components/site/tool-card';

export const metadata = { title: 'Catégories · Koupi' };

export default function Categories() {
  return (
    <main className="k-page">
      <div className="k-wrap">
        <div className="k-page-head">
          <span className="k-eyebrow">Explorer</span>
          <h1>Les catégories</h1>
          <p>Des outils en ligne utiles, avec les codes des créateurs qui les recommandent.</p>
        </div>
        <div className="k-cat-grid">
          {categories.map(category => (
            <Link className="k-cat" href={routes.category(category.slug)} key={category.slug} data-reveal>
              <strong>{category.name}</strong>
              <span>{category.count} outils <span aria-hidden="true">→</span></span>
            </Link>
          ))}
        </div>
        <h2 style={{ fontSize: 36, margin: '80px 0 24px' }} data-reveal>Tous les outils</h2>
        <div className="k-tool-grid">{tools.map(tool => <ToolCard tool={tool} key={tool.slug} />)}</div>
      </div>
    </main>
  );
}
