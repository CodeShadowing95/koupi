// Niveau d'un créateur déduit de ses comptes sur les réseaux (table creator_accounts, ADR-0016).
// Chaque compte est jugé seul (le seuil d'abonnés vaut pour le compte contrôlé), puis on garde le meilleur.
import { eq } from 'drizzle-orm';
import type { Db } from '@/db';
import { creatorAccounts, type CreatorAccountRow } from '@/db/schema';
import { controlledByMerkod, creatorLevelOf, type CreatorLevel } from './verification';
import { cleanMetrics } from './account-metrics';

const RANK: Record<CreatorLevel, number> = { spotted: 0, checked: 1, verified: 2 };

type AccountFacts = Pick<CreatorAccountRow, 'claimStatus' | 'platformVerified' | 'adminCheckedAt' | 'subscribers'> & { metrics?: unknown };

function factsOf(account: AccountFacts) {
  return {
    claimed: account.claimStatus === 'verified',
    platformVerified: account.platformVerified,
    adminChecked: account.adminCheckedAt !== null,
    subscribers: account.subscribers,
    ratingCount: cleanMetrics(account.metrics).ratingCount ?? null,
  };
}

export function accountLevelOf(account: AccountFacts): CreatorLevel {
  return creatorLevelOf(factsOf(account));
}

/** Le compte est « Contrôlé par Merkod » (badge, ou contrôle de l'admin avec le seuil d'audience) : il peut être prouvé par la bio. */
export function accountControlled(account: AccountFacts): boolean {
  return controlledByMerkod(factsOf(account));
}

/** Les créateurs qui ont au moins un compte « Créateur vérifié » (preuve par la bio sur un compte contrôlé). */
export async function provenCreatorIds(db: Db): Promise<Set<string>> {
  const accounts = await db.select().from(creatorAccounts).where(eq(creatorAccounts.claimStatus, 'verified'));
  return new Set(accounts.filter(account => accountLevelOf(account) === 'verified').map(account => account.creatorId));
}

/** Les créateurs qui ont au moins un compte prouvé par la bio, quelle que soit son audience : l'espace leur est ouvert (ADR-0041). */
export async function bioProvenCreatorIds(db: Db): Promise<Set<string>> {
  const accounts = await db.selectDistinct({ creatorId: creatorAccounts.creatorId }).from(creatorAccounts).where(eq(creatorAccounts.claimStatus, 'verified'));
  return new Set(accounts.map(account => account.creatorId));
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
