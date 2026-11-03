// Créateur connecté pour la requête en cours (pages serveur). null si personne n'est connecté.
import { cookies } from 'next/headers';
import { getDb } from '@/db';
import { loadCreatorAccount, type CreatorAccount } from './creator-auth';
import { CREATOR_COOKIE, readCreatorToken } from './creator-session';

export async function currentCreatorAccount(): Promise<CreatorAccount | null> {
  const userId = await readCreatorToken((await cookies()).get(CREATOR_COOKIE)?.value, process.env.SESSION_SECRET);
  return userId ? loadCreatorAccount(getDb(), userId) : null;
}
