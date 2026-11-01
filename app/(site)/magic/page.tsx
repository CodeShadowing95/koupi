import type { Metadata } from 'next';
import { isPublic } from '@/lib/data';
import { getCatalog } from '@/lib/catalog-server';
import { MagicHome, type MagicCode } from '@/components/site/magic';
import './magic.css';

export const metadata: Metadata = {
  title: 'Copy Magic',
  description: 'La page d’accueil de Koupi, version spectacle : entre dans le coupon.',
};

// Variante « spectacle » de l'accueil : même contenu, mise en scène poussée (voir components/site/magic.tsx).
export default async function MagicPage() {
  const { categories, codes, tools } = await getCatalog();
  const live = codes.filter(isPublic);
  const websiteOf = (name: string) => tools.find(tool => tool.name === name)?.website;
  const toMagic = (code: (typeof live)[number]): MagicCode => ({
    id: code.id,
    code: code.code,
    tool: code.tool,
    toolSlug: code.toolSlug,
    creator: code.creator,
    creatorSlug: code.creatorSlug,
    discount: code.discount,
    success: code.success,
    votes: code.votes,
    link: code.creatorLink || websiteOf(code.tool) || '#',
  });
  const verified = live.filter(code => code.status === 'verified');
  const onePerTool = verified.filter((code, index, all) => all.findIndex(other => other.tool === code.tool) === index);
  const best = [...live].sort((a, b) => b.success - a.success || b.votes - a.votes)[0];

  return (
    <MagicHome
      codes={onePerTool.slice(0, 10).map(toMagic)}
      best={best ? toMagic(best) : undefined}
      tools={tools}
      creators={[...new Set(live.map(code => code.creator))]}
      spotlight={[...new Map(live.map(code => [code.creatorSlug, code])).values()].slice(0, 12).map(code => ({
        name: code.creator,
        slug: code.creatorSlug,
        codes: live.filter(other => other.creatorSlug === code.creatorSlug).length,
        tool: code.tool,
        discount: code.discount,
      }))}
      categories={categories.filter(category => category.count > 0).map(category => ({ slug: category.slug, name: category.name, count: category.count }))}
    />
  );
}
