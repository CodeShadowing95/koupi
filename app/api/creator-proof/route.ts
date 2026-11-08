import { NextResponse, type NextRequest } from 'next/server';
import { getDb } from '@/db';
import { readJsonBody } from '@/lib/http';
import { UUID_PATTERN } from '@/lib/admin-guard';
import { loadCreatorAccount } from '@/lib/creator-auth';
import { youtubeDescriptionReader } from '@/lib/creator-claim';
import { isSelfProofAction, runSelfProof } from '@/lib/creator-self-proof';
import { CREATOR_COOKIE, readCreatorToken } from '@/lib/creator-session';
import { consumeRateLimit, CREATOR_PROOF_RULE } from '@/lib/rate-limit';
import { revalidateCatalog } from '@/lib/catalog-server';

// Preuve par la bio en libre-service (ADR-0041) : le créateur connecté demande son code, fait lire sa bio YouTube,
// ou dit l'avoir mis sur un autre réseau. Limite par créateur : chaque lecture coûte une unité du quota YouTube.
export async function POST(request: NextRequest) {
  const userId = await readCreatorToken(request.cookies.get(CREATOR_COOKIE)?.value, process.env.SESSION_SECRET);
  const db = getDb();
  const user = userId ? await loadCreatorAccount(db, userId) : null;
  if (!user) return NextResponse.json({ error: 'Connecte-toi d’abord.' }, { status: 401 });
  try {
    const body = await readJsonBody(request, 500);
    if (!body.ok) return NextResponse.json({ error: 'Requête invalide.' }, { status: body.status });
    const { accountId, action } = body.data;
    if (typeof accountId !== 'string' || !UUID_PATTERN.test(accountId) || !isSelfProofAction(action)) {
      return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
    }
    const limit = await consumeRateLimit(db, `creator-proof:${user.id}`, CREATOR_PROOF_RULE);
    if (!limit.allowed) {
      return NextResponse.json({ error: 'Beaucoup d’essais d’un coup. Laisse le temps à ta bio de s’enregistrer, puis réessaie.' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } });
    }
    const result = await runSelfProof(db, user, accountId, action, { readDescription: youtubeDescriptionReader(process.env.YOUTUBE_API_KEY) });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.error === 'Compte introuvable.' ? 404 : 400 });
    if (result.data.state === 'proven') revalidateCatalog();
    return NextResponse.json({ ok: true, ...result.data });
  } catch (error) {
    console.error('creator self proof failed', error);
    return NextResponse.json({ error: 'Impossible de mener cette étape. Réessaie dans un moment.' }, { status: 500 });
  }
}
