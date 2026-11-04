import Link from '@/components/site/site-pages';
import { notFound } from 'next/navigation';
import { isPublic } from '@/lib/data';
import { getCatalog } from '@/lib/catalog-server';
import { parseCategoryFilters } from '@/lib/category-browse';
import { routes } from '@/lib/routes';
import { CategoryBrowser } from '@/components/site/category-browser';
import { PageHead } from '@/components/site/page-head';
import { VoteInvite } from '@/components/site/vote-invite';

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Pick<Props, 'params'>) {
  const { slug } = await params;
  const category = (await getCatalog()).categories.find(item => item.slug === slug);
  return category ? { title: `Codes promo ${category.name} · Merkod`, description: `Les codes promo des créateurs pour les outils ${category.name}, reliés à leur source et vérifiés.` } : {};
}

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
        <PageHead
          crumbs={[{ label: 'Codes', href: category.family ? `${routes.codes}?family=${category.family}` : routes.codes }, { label: category.name }]}
          eyebrow="Catégorie"
          title={category.name}
          lead="Compare les codes des créateurs pour les outils de cette catégorie."
        />
        {categoryTools.length === 0 ? (
          <div className="k-empty"><h2>Pas encore d&apos;outil ici.</h2><p>Tu connais un code pour un outil de cette catégorie ?</p><Link className="k-btn k-btn-paper k-btn-ticket" href={routes.submit()}>Proposer un code</Link></div>
        ) : (
          <CategoryBrowser codes={categoryCodes} tools={categoryTools} initial={parseCategoryFilters(query, slugs)} now={Date.now()} />
        )}
      </div>
      <VoteInvite trigger="copy" />
    </main>
  );
}
