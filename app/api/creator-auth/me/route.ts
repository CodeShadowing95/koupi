// Qui est connecté côté créateur, pour l'icône de la barre du haut (les pages publiques restent en cache, sans cookie).
// Ne renvoie que le nom de la page du créateur, jamais son e-mail. Sans cookie valide, la base n'est pas lue.
import { NextResponse, type NextRequest } from 'next/server';
import { getDb } from '@/db';
import { loadCreatorAccount } from '@/lib/creator-auth';
import { CREATOR_COOKIE, readCreatorToken } from '@/lib/creator-session';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const userId = await readCreatorToken(request.cookies.get(CREATOR_COOKIE)?.value, process.env.SESSION_SECRET);
  const account = userId ? await loadCreatorAccount(getDb(), userId) : null;
  return NextResponse.json(
    account ? { signedIn: true, name: account.creator?.name ?? null } : { signedIn: false, name: null },
    { headers: { 'cache-control': 'private, no-store' } },
  );
}
