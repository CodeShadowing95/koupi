// Preuve par la bio en libre-service (ADR-0041). Le créateur connecté revendique une page, Merkod lui donne SON code
// pour chacun des comptes de cette page, il le colle dans sa bio. Pour YouTube, Merkod lit la description tout seul ;
// pour les autres réseaux, il dit « c'est fait » et l'admin regarde le profil. Une fois le code trouvé :
// le compte est prouvé (comme par l'admin, ADR-0020) et le créateur reçoit l'accès à son espace.
// Garde-fou : seul un compte que l'admin a contrôlé (le vrai compte du créateur, pas une copie) peut être prouvé.
// Le seuil d'audience ne bloque pas : il décide seulement de la rosette « Créateur vérifié » (lib/verification.ts).
import { and, asc, eq, inArray, isNotNull } from 'drizzle-orm';
import type { Db } from '@/db';
import { creatorAccounts, creatorClaimCodes, creatorRequests, creators, creatorUsers, type CreatorAccountRow } from '@/db/schema';
import { bioContainsCode, claimCodeExpired, newClaimCode, type DescriptionReader } from './creator-claim';
import { CLAIM_CODE_DAYS, PLATFORM_LABELS, type CreatorPlatform } from './creator-accounts-display';
import { isProvisionalPage, mergeProvisionalPage } from './creator-merge';

type Parsed<T> = { ok: true; data: T } | { ok: false; error: string };

export type ProofState = 'proven' | 'taken' | 'locked' | 'unchecked' | 'open' | 'waiting' | 'expired';
export type SelfProofAccount = {
  id: string; platform: CreatorPlatform; label: string; handle: string; url: string;
  /** Merkod lit la bio tout seul (chaîne YouTube connue par son ID). */
  readable: boolean;
  state: ProofState;
  code: string | null;
};
export type SelfProofCreator = { slug: string; name: string; accounts: SelfProofAccount[] };
type CodeRow = typeof creatorClaimCodes.$inferSelect;

export const readable = (account: Pick<CreatorAccountRow, 'platform' | 'externalId'>) => account.platform === 'youtube' && Boolean(account.externalId);

/** État d'un compte pour ce créateur connecté. */
export function proofState(account: Pick<CreatorAccountRow, 'claimStatus' | 'adminCheckedAt'>, mine: Pick<CodeRow, 'createdAt' | 'submittedAt'> | undefined, now: Date): ProofState {
  if (account.claimStatus === 'verified') return 'proven';
  if (account.claimStatus === 'revoked') return 'locked';
  if (!account.adminCheckedAt) return 'unchecked';
  if (!mine) return 'open';
  if (claimCodeExpired(mine.createdAt, now)) return 'expired';
  return mine.submittedAt ? 'waiting' : 'open';
}

/** Les pages que ce créateur revendique (demandes ouvertes avec son e-mail) et leurs comptes. */
export async function loadSelfProof(db: Db, user: { id: string; email: string }, now = new Date()): Promise<SelfProofCreator[]> {
  const pages = await db.selectDistinct({ id: creators.id, slug: creators.slug, name: creators.name }).from(creatorRequests)
    .innerJoin(creators, eq(creators.id, creatorRequests.creatorId))
    .where(and(eq(creatorRequests.kind, 'claim'), eq(creatorRequests.email, user.email), eq(creatorRequests.status, 'new')))
    .orderBy(asc(creators.name));
  if (pages.length === 0) return [];
  const accounts = await db.select().from(creatorAccounts).where(inArray(creatorAccounts.creatorId, pages.map(page => page.id)));
  const mine = await db.select().from(creatorClaimCodes).where(eq(creatorClaimCodes.userId, user.id));
  const byAccount = new Map(mine.map(row => [row.accountId, row]));
  return pages.map(page => ({
    slug: page.slug, name: page.name,
    accounts: accounts.filter(account => account.creatorId === page.id)
      .sort((a, b) => Number(b.platform === 'youtube') - Number(a.platform === 'youtube') || (b.subscribers ?? 0) - (a.subscribers ?? 0))
      .map(account => {
        const code = byAccount.get(account.id);
        const state = proofState(account, code, now);
        return {
          id: account.id, platform: account.platform, label: PLATFORM_LABELS[account.platform], handle: account.handle, url: account.url,
          readable: readable(account), state, code: state === 'open' || state === 'waiting' ? code?.code ?? null : null,
        };
      }),
  }));
}

export const SELF_PROOF_ACTIONS = ['start', 'check', 'submit'] as const;
export type SelfProofAction = typeof SELF_PROOF_ACTIONS[number];
export const isSelfProofAction = (value: unknown): value is SelfProofAction => (SELF_PROOF_ACTIONS as readonly unknown[]).includes(value);
export type SelfProofResult = { state: ProofState; code: string | null; found?: boolean };
export type SelfProofDeps = { readDescription: DescriptionReader | null; now?: Date; newCode?: () => string };

/**
 * start : donne (ou redonne, s'il a expiré) le code de ce créateur pour ce compte.
 * check : YouTube, Merkod lit la description et prouve le compte si le code y est.
 * submit : autres réseaux, le créateur dit avoir mis le code ; l'admin le constate (confirmSubmittedCode).
 */
export async function runSelfProof(db: Db, user: { id: string; email: string }, accountId: string, action: SelfProofAction, deps: SelfProofDeps): Promise<Parsed<SelfProofResult>> {
  const now = deps.now ?? new Date();
  const [account] = await db.select().from(creatorAccounts).where(eq(creatorAccounts.id, accountId)).limit(1);
  if (!account) return { ok: false, error: 'Compte introuvable.' };
  // Seulement les comptes d'une page qu'il revendique : le reste ne le regarde pas.
  const [claim] = await db.select({ id: creatorRequests.id }).from(creatorRequests)
    .where(and(eq(creatorRequests.kind, 'claim'), eq(creatorRequests.email, user.email), eq(creatorRequests.status, 'new'), eq(creatorRequests.creatorId, account.creatorId))).limit(1);
  if (!claim) return { ok: false, error: 'Revendique d’abord cette page (« C’est ta page ? »).' };
  const [mine] = await db.select().from(creatorClaimCodes).where(and(eq(creatorClaimCodes.userId, user.id), eq(creatorClaimCodes.accountId, accountId))).limit(1);
  const state = proofState(account, mine, now);
  if (state === 'proven') return { ok: false, error: 'Ce compte est déjà prouvé. Si c’est le tien et que tu n’as pas accès, écris-nous depuis la page Ton avis.' };
  if (state === 'locked') return { ok: false, error: 'La preuve est fermée sur ce compte. Écris-nous depuis la page Ton avis.' };
  if (state === 'unchecked') return { ok: false, error: 'Merkod contrôle d’abord ce compte (qu’il existe et publie bien sous ce nom). Tu pourras le prouver juste après.' };

  if (action === 'start') {
    if (mine && state !== 'expired') return { ok: true, data: { state, code: mine.code } };
    const code = (deps.newCode ?? newClaimCode)();
    await db.insert(creatorClaimCodes).values({ userId: user.id, accountId, code, createdAt: now })
      .onConflictDoUpdate({ target: [creatorClaimCodes.userId, creatorClaimCodes.accountId], set: { code, createdAt: now, checkedAt: null, submittedAt: null } });
    return { ok: true, data: { state: 'open', code } };
  }
  if (!mine || state === 'expired') return { ok: false, error: `Demande d’abord ton code (il reste valable ${CLAIM_CODE_DAYS} jours).` };

  if (action === 'submit') {
    if (readable(account)) return { ok: false, error: 'Pour YouTube, Merkod lit ta description tout seul : clique « Vérifier ».' };
    await db.update(creatorClaimCodes).set({ submittedAt: now }).where(eq(creatorClaimCodes.id, mine.id));
    return { ok: true, data: { state: 'waiting', code: mine.code } };
  }

  if (!readable(account)) return { ok: false, error: 'Merkod ne lit pas ce réseau tout seul : clique « C’est fait », on regarde ton profil.' };
  if (!deps.readDescription) return { ok: false, error: 'La lecture de YouTube est momentanément indisponible. Réessaie plus tard.' };
  let description: string | null;
  try { description = await deps.readDescription(account.externalId!); } catch { return { ok: false, error: 'YouTube ne répond pas. Réessaie dans un moment.' }; }
  if (description === null) return { ok: false, error: 'Cette chaîne n’existe plus sur YouTube.' };
  if (!bioContainsCode(description, mine.code)) {
    await db.update(creatorClaimCodes).set({ checkedAt: now }).where(eq(creatorClaimCodes.id, mine.id));
    return { ok: true, data: { state: 'open', code: mine.code, found: false } };
  }
  await proveFor(db, mine.userId, account, now);
  return { ok: true, data: { state: 'proven', code: null, found: true } };
}

/** Le compte est prouvé par ce créateur : même état que la preuve faite par l'admin, accès à l'espace, demande traitée. */
async function proveFor(db: Db, userId: string, account: CreatorAccountRow, now: Date) {
  await db.update(creatorAccounts).set({ claimStatus: 'verified', claimMethod: 'bio_code', claimedAt: now, claimCode: null, claimCodeAt: null, lastRecheckedAt: now, updatedAt: now })
    .where(eq(creatorAccounts.id, account.id));
  // Les codes des autres personnes sur ce compte ne valent plus rien.
  await db.delete(creatorClaimCodes).where(eq(creatorClaimCodes.accountId, account.id));
  // Il avait ouvert son studio sur une page provisoire (ADR-0043) : elle est fusionnée dans la vraie page (ADR-0044).
  const [before] = await db.select({ creatorId: creatorUsers.creatorId }).from(creatorUsers).where(eq(creatorUsers.id, userId)).limit(1);
  if (before?.creatorId && before.creatorId !== account.creatorId && await isProvisionalPage(db, before.creatorId)) {
    await mergeProvisionalPage(db, before.creatorId, account.creatorId, now);
  }
  const [user] = await db.update(creatorUsers).set({ creatorId: account.creatorId, accessGrantedAt: now })
    .where(eq(creatorUsers.id, userId)).returning({ email: creatorUsers.email });
  if (user) {
    await db.update(creatorRequests).set({ status: 'done', handledAt: now })
      .where(and(eq(creatorRequests.kind, 'claim'), eq(creatorRequests.email, user.email), eq(creatorRequests.creatorId, account.creatorId), eq(creatorRequests.status, 'new')));
  }
}

// ---------- Admin : codes à constater sur les réseaux que Merkod ne lit pas ----------

export type SubmittedCode = {
  id: string; code: string; submittedAt: string; email: string;
  account: { id: string; label: string; handle: string; url: string };
  creator: { slug: string; name: string };
};

export async function listSubmittedCodes(db: Db): Promise<SubmittedCode[]> {
  const rows = await db.select({ row: creatorClaimCodes, email: creatorUsers.email, account: creatorAccounts, creator: { slug: creators.slug, name: creators.name } })
    .from(creatorClaimCodes)
    .innerJoin(creatorUsers, eq(creatorUsers.id, creatorClaimCodes.userId))
    .innerJoin(creatorAccounts, eq(creatorAccounts.id, creatorClaimCodes.accountId))
    .innerJoin(creators, eq(creators.id, creatorAccounts.creatorId))
    .where(isNotNull(creatorClaimCodes.submittedAt))
    .orderBy(asc(creatorClaimCodes.submittedAt));
  return rows.map(({ row, email, account, creator }) => ({
    id: row.id, code: row.code, submittedAt: row.submittedAt!.toISOString(), email,
    account: { id: account.id, label: PLATFORM_LABELS[account.platform], handle: account.handle, url: account.url }, creator,
  }));
}

/** L'admin a regardé le profil : seen = le code y est (compte prouvé), sinon le créateur peut réessayer. */
export async function reviewSubmittedCode(db: Db, id: string, seen: boolean, now = new Date()): Promise<Parsed<{ proven: boolean }>> {
  const [row] = await db.select().from(creatorClaimCodes).where(eq(creatorClaimCodes.id, id)).limit(1);
  if (!row || !row.submittedAt) return { ok: false, error: 'Code introuvable ou déjà traité.' };
  if (!seen) {
    await db.update(creatorClaimCodes).set({ submittedAt: null }).where(eq(creatorClaimCodes.id, id));
    return { ok: true, data: { proven: false } };
  }
  const [account] = await db.select().from(creatorAccounts).where(eq(creatorAccounts.id, row.accountId)).limit(1);
  if (!account) return { ok: false, error: 'Compte introuvable.' };
  const state = proofState(account, row, now);
  if (state === 'unchecked') return { ok: false, error: 'Contrôle d’abord ce compte (coche « J’ai contrôlé ce compte ») : la preuve ne vaut que pour le vrai compte du créateur.' };
  if (state === 'expired') return { ok: false, error: `Ce code a plus de ${CLAIM_CODE_DAYS} jours : le créateur doit en demander un nouveau.` };
  if (state !== 'waiting') return { ok: false, error: 'Ce compte ne peut plus être prouvé ainsi.' };
  await proveFor(db, row.userId, account, now);
  return { ok: true, data: { proven: true } };
}
