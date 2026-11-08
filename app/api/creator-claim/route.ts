import { NextResponse, type NextRequest } from 'next/server';
import { getDb } from '@/db';
import { readJsonBody } from '@/lib/http';
import { clientHash } from '@/lib/client';
import { loadCreatorAccount, recordClaim, SLUG } from '@/lib/creator-auth';
import { CREATOR_COOKIE, readCreatorToken } from '@/lib/creator-session';
import { httpUrl } from '@/lib/creator-requests';
import { consumeRateLimit, CREATOR_SIGN_IN_RULE } from '@/lib/rate-limit';

// « C'est ma page » pour un créateur déjà connecté : la revendication est notée à son e-mail,
// sans nouveau lien de connexion, et le Studio passe à l'étape de preuve par la bio (ADR-0041).
export async function POST(request: NextRequest) {
  const userId = await readCreatorToken(request.cookies.get(CREATOR_COOKIE)?.value, process.env.SESSION_SECRET);
  const db = getDb();
  const user = userId ? await loadCreatorAccount(db, userId) : null;
  if (!user) return NextResponse.json({ error: 'Connecte-toi d’abord.' }, { status: 401 });
  const production = process.env.NODE_ENV === 'production';
  const salt = process.env.HASH_SALT || (production ? '' : 'koupi-development-salt');
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin).replace(/\/+$/, '');
  if (!salt) return NextResponse.json({ error: 'La revendication est momentanément indisponible.' }, { status: 503 });
  try {
    const body = await readJsonBody(request, 500);
    if (!body.ok) return NextResponse.json({ error: 'Requête invalide.' }, { status: body.status });
    const slug = typeof body.data.slug === 'string' ? body.data.slug.trim().slice(0, 200) : '';
    if (!SLUG.test(slug)) return NextResponse.json({ error: 'Créateur inconnu.' }, { status: 400 });
    // Un créateur relié à une page non vérifiée ne revendique que la sienne, pour y faire ajouter sa chaîne puis la prouver.
    if (user.creator && user.creator.slug !== slug) return NextResponse.json({ error: 'Ton espace est déjà relié à une page.' }, { status: 409 });
    const rawUrl = typeof body.data.accountUrl === 'string' ? body.data.accountUrl.trim().slice(0, 1000) : '';
    const accountUrl = rawUrl ? httpUrl(rawUrl) : null;
    if (rawUrl && !accountUrl) return NextResponse.json({ error: 'Le lien de ta chaîne doit être une adresse web valide.' }, { status: 400 });
    if (user.creator && !accountUrl) return NextResponse.json({ error: 'Colle le lien de ta chaîne ou de ton profil.' }, { status: 400 });
    const limit = await consumeRateLimit(db, `creator-claim:${user.id}`, CREATOR_SIGN_IN_RULE);
    if (!limit.allowed) {
      return NextResponse.json({ error: 'Beaucoup de demandes d’un coup. Réessaie dans un moment.' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } });
    }
    const claimed = await recordClaim(db, { email: user.email, slug, ipHash: clientHash(request, salt), appUrl, message: user.creator
      ? 'Demande de vérification depuis le Studio : ajoute ce compte à sa page et contrôle-le, il le prouvera ensuite par sa bio.'
      : 'Revendication envoyée depuis le Studio, par un créateur déjà connecté.', ...(accountUrl ? { accountUrl } : {}) });
    if (!claimed.ok) return NextResponse.json({ error: claimed.error }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('creator claim failed', error);
    return NextResponse.json({ error: 'Impossible d’enregistrer ta demande. Réessaie dans un instant.' }, { status: 500 });
  }
}
