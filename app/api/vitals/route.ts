import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { clientHash } from '@/lib/client';
import { readJsonBody } from '@/lib/http';
import { publicSalt } from '@/lib/public-salt';
import { consumeRateLimit, VITALS_RULE } from '@/lib/rate-limit';
import { parseVital, recordVital } from '@/lib/web-vitals';

// Vitesse ressentie (ADR-0038) : { path, metric, device, rating } envoyé par le navigateur du visiteur.
// On ajoute 1 au total du jour pour ce type de page. L'IP hachée limite les abus, elle n'est pas gardée avec la mesure.
// La réponse est toujours vide : rien à afficher, et une erreur ne doit jamais gêner la page.
export async function POST(request: Request) {
  const salt = publicSalt();
  if (!salt) return new NextResponse(null, { status: 204 });
  try {
    const parsed = await readJsonBody(request, 500);
    if (!parsed.ok) return new NextResponse(null, { status: parsed.status });
    const vital = parseVital(parsed.data);
    if (!vital) return new NextResponse(null, { status: 400 });
    const db = getDb();
    const limit = await consumeRateLimit(db, `vitals:${clientHash(request, salt)}`, VITALS_RULE);
    if (limit.allowed) await recordVital(db, vital);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('web vital failed', error);
    return new NextResponse(null, { status: 204 });
  }
}
