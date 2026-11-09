import { getCatalog } from '@/lib/catalog-server';
import { siteUrl } from '@/lib/seo';
import { kitCodes, kitKindOf, kitPath, kitYear } from '@/lib/season-kit';
import { seasonStoryImage } from '@/components/season-story';

// Image story du kit de saison d'un créateur. ?download=1 la propose en téléchargement.
export async function GET(request: Request, { params }: { params: Promise<{ slug: string; season: string }> }) {
  const { slug, season } = await params;
  const kind = kitKindOf(season);
  if (!kind) return new Response('Saison inconnue', { status: 404 });
  const { codes } = await getCatalog();
  const own = codes.filter(code => code.creatorSlug === slug);
  if (!own.length) return new Response('Créateur inconnu', { status: 404 });
  const now = new Date();
  const host = new URL(siteUrl()).host;
  const image = await seasonStoryImage({
    kind,
    year: kitYear(kind, now),
    creator: own[0].creator,
    url: `${host}${kitPath(slug, kind)}`,
    codes: kitCodes(own, now).map(code => ({ tool: code.tool, code: code.code, discount: code.discount })),
  });
  const headers = new Headers(image.headers);
  headers.set('Cache-Control', 'public, max-age=600, s-maxage=600');
  if (new URL(request.url).searchParams.has('download')) headers.set('Content-Disposition', `attachment; filename="merkod-${kind}-${slug}.png"`);
  return new Response(image.body, { status: 200, headers });
}
