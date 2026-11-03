import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isPublic } from '@/lib/data';
import { getCatalog } from '@/lib/catalog-server';
import { parseCategoryFilters } from '@/lib/category-browse';
import { routes } from '@/lib/routes';
import { CategoryBrowser } from '@/components/site/category-browser';

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function Category({ params, searchParams }: Props) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const { categories, codes, tools } = await getCatalog();
  const category = categories.find(item => item.slug === slug);
  if (!category) notFound();
  const categoryTools = tools.filter(tool => tool.category === category.name);
  const slugs = categoryTools.map(tool => tool.slug);
  const categoryCodes = codes.filter(code => isPublic(code) && slugs.includes(code.toolSlug));
  return (
    <main className="k-page">
      <div className="k-wrap">
        <nav className="k-crumbs" aria-label="Fil d'Ariane"><Link href={routes.categories}>Catégories</Link><span aria-hidden="true">/</span><span aria-current="page" style={{ color: 'var(--text)' }}>{category.name}</span></nav>
        <div className="k-page-head" style={{ marginTop: 24 }}>
          <span className="k-eyebrow">Catégorie</span>
          <h1>{category.name}</h1>
          <p>Compare les codes des créateurs pour les outils de cette catégorie.</p>
        </div>
        {categoryTools.length === 0 ? (
          <div className="k-empty"><h2>Pas encore d&apos;outil ici.</h2><p>Tu connais un code pour un outil de cette catégorie ?</p><Link className="k-btn k-btn-paper k-btn-ticket" href={routes.submit()}>Proposer un code</Link></div>
        ) : (
          <CategoryBrowser codes={categoryCodes} tools={categoryTools} initial={parseCategoryFilters(query, slugs)} now={Date.now()} />
        )}
      </div>
    </main>
  );
}
