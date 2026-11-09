import { getCatalog } from '@/lib/catalog-server';
import { HOME_OG_TEXT } from '@/lib/og-text';
import { KIT_LABEL, kitCodes, kitKindOf, kitYear } from '@/lib/season-kit';
import { OG_CONTENT_TYPE, OG_SIZE, ogCouponImage } from '@/components/og-coupon';

// Aperçu de partage du kit de saison : le créateur, la saison et ses outils.
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'Les codes promo de saison d’un créateur sur Merkod';

export default async function Image({ params }: { params: Promise<{ slug: string; season: string }> }) {
  const { slug, season } = await params;
  const kind = kitKindOf(season);
  const { codes } = await getCatalog();
  const own = codes.filter(code => code.creatorSlug === slug);
  if (!kind || !own.length) return ogCouponImage(HOME_OG_TEXT);
  const now = new Date();
  const picks = kitCodes(own, now);
  const tools = picks.map(code => code.tool);
  return ogCouponImage({
    eyebrow: `${KIT_LABEL[kind]} ${kitYear(kind, now)}`,
    title: own[0].creator,
    highlight: picks.length ? `${picks.length} ${picks.length > 1 ? 'codes promo' : 'code promo'}` : undefined,
    detail: tools.length ? tools.slice(0, 3).join(', ') + (tools.length > 3 ? '…' : '') : undefined,
    stub: kind === 'noel' ? 'Ses codes de Noël' : 'Ses codes Black Friday',
  });
}
