import { getDb } from '@/db';
import { loadToolImage } from '@/lib/stored-images';

// Logo d’un outil gardé en base (ADR-0027), servi par Merkod : /media/logos/<slug>.<ext>?v=<date>.
// L'adresse change à chaque actualisation, le navigateur peut donc la garder longtemps.
export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const slug = file.replace(/\.(jpg|png|webp|svg)$/, '');
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return new Response('Not found', { status: 404 });
  try {
    const image = await loadToolImage(getDb(), slug);
    if (!image) return new Response('Not found', { status: 404 });
    return new Response(new Uint8Array(image.body), {
      headers: {
        'Content-Type': image.mime,
        'Cache-Control': 'public, max-age=604800, stale-while-revalidate=86400',
        // Une image ouverte seule ne peut rien exécuter (utile pour un SVG).
        'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('tool image read failed', error);
    return new Response('Unavailable', { status: 503 });
  }
}
