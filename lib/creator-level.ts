// Niveau d'un créateur déduit de ses comptes sur les réseaux (table creator_accounts, ADR-0016).
// Chaque compte est jugé seul (le seuil d'abonnés vaut pour le compte contrôlé), puis on garde le meilleur.
import { eq } from 'drizzle-orm';
import type { Db } from '@/db';
import { creatorAccounts, type CreatorAccountRow } from '@/db/schema';
import { creatorLevelOf, type CreatorLevel } from './verification';

const RANK: Record<CreatorLevel, number> = { spotted: 0, checked: 1, verified: 2 };

type AccountFacts = Pick<CreatorAccountRow, 'claimStatus' | 'platformVerified' | 'adminCheckedAt' | 'subscribers'>;

export function accountLevelOf(account: AccountFacts): CreatorLevel {
  return creatorLevelOf({
    claimed: account.claimStatus === 'verified',
    platformVerified: account.platformVerified,
    adminChecked: account.adminCheckedAt !== null,
    subscribers: account.subscribers,
  });
}

/** Meilleur niveau parmi les comptes. Un créateur sans compte relié est « repéré ». */
export function creatorLevelFromAccounts(accounts: AccountFacts[]): CreatorLevel {
  return bestLevel(accounts.map(accountLevelOf));
}

/** Le plus haut des niveaux donnés, « repéré » si la liste est vide. */
export function bestLevel(levels: CreatorLevel[]): CreatorLevel {
  return levels.reduce<CreatorLevel>((best, level) => (RANK[level] > RANK[best] ? level : best), 'spotted');
}

export async function creatorLevelFor(db: Db, creatorId: string): Promise<CreatorLevel> {
  const accounts = await db.select().from(creatorAccounts).where(eq(creatorAccounts.creatorId, creatorId));
  return creatorLevelFromAccounts(accounts);
}
