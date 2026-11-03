import Link from '@/components/site/site-pages';
import { getCatalog } from '@/lib/catalog-server';
import { routes } from '@/lib/routes';
import { ToolCard } from '@/components/site/tool-card';
import { PageHead } from '@/components/site/page-head';
import { plural } from '@/lib/ui';

export const metadata = { title: 'Catégories · Koupi' };

export default async function Categories() {
  const { categories, tools } = await getCatalog();
  return (
    <main className="k-page">
      <div className="k-wrap">
        <PageHead eyebrow="Explorer" title="Les catégories" lead="Des outils en ligne utiles, avec les codes des créateurs qui les recommandent." />
        <div className="k-cat-grid">
          {categories.filter(category => category.count > 0).map(category => (
            <Link className="k-cat" href={routes.category(category.slug)} key={category.slug} data-reveal>
              <strong>{category.name}</strong>
              <span>{plural(category.count, 'outil', 'outils')} <span aria-hidden="true">→</span></span>
            </Link>
          ))}
        </div>
        <h2 className="k-page-h2" data-reveal>Tous les outils</h2>
        <div className="k-tool-grid">{tools.map(tool => <ToolCard tool={tool} key={tool.slug} />)}</div>
      </div>
    </main>
  );
}
