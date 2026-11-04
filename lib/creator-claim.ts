// Preuve par la bio (ADR-0020) : Merkod donne un code au créateur, il le place dans la bio d'un de ses comptes,
// Merkod le lit (YouTube) ou l'admin le constate (autres réseaux). Le compte est alors « réclamé » : Créateur vérifié.
import { randomInt } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { Db } from '@/db';
import { creatorAccounts } from '@/db/schema';
import { CLAIM_CODE_DAYS } from './creator-accounts-display';
import { youtubeFetch } from './api-usage';

type Parsed<T> = { ok: true; data: T } | { ok: false; error: string };

// Sans 0/O, 1/I/L : le code se recopie sans se tromper.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function newClaimCode(pick: (max: number) => number = randomInt): string {
  let code = 'MERKOD-';
  for (let i = 0; i < 6; i++) code += ALPHABET[pick(ALPHABET.length)];
  return code;
}

/** Le code est-il dans la bio ? Majuscules et espaces autour du tiret ignorés. */
export function bioContainsCode(bio: string, code: string): boolean {
  const flat = bio.toUpperCase().replace(/\s*-\s*/g, '-');
  return flat.includes(code.toUpperCase());
}

export function claimCodeExpired(issuedAt: Date, now: Date): boolean {
  return now.getTime() - issuedAt.getTime() > CLAIM_CODE_DAYS * 86_400_000;
}

/** Description d'une chaîne YouTube par son ID (1 unité de quota). null si la chaîne n'existe plus. */
export type DescriptionReader = (channelId: string) => Promise<string | null>;

export function youtubeDescriptionReader(apiKey: string | undefined, fetchFn: typeof fetch = youtubeFetch): DescriptionReader | null {
  if (!apiKey) return null;
  return async channelId => {
    const endpoint = `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${encodeURIComponent(channelId)}&key=${encodeURIComponent(apiKey)}`;
    const response = await fetchFn(endpoint, { cache: 'no-store' });
    if (!response.ok) throw new Error(`YouTube API ${response.status}`);
    const body = await response.json() as { items?: { snippet?: { description?: string } }[] };
    const item = body.items?.[0];
    return item ? item.snippet?.description ?? '' : null;
  };
}

export const CLAIM_ACTIONS = ['start', 'check', 'confirm', 'cancel', 'revoke'] as const;
export type ClaimAction = typeof CLAIM_ACTIONS[number];
export type ClaimResult = { status: 'pending' | 'verified' | 'none' | 'revoked'; code: string | null; found?: boolean };
export type ClaimDeps = { readDescription: DescriptionReader | null; now?: Date; newCode?: () => string };

export function isClaimAction(value: unknown): value is ClaimAction {
  return (CLAIM_ACTIONS as readonly unknown[]).includes(value);
}

/** Une étape de la preuve par la bio sur un compte. */
export async function runClaimAction(db: Db, accountId: string, action: ClaimAction, deps: ClaimDeps): Promise<Parsed<ClaimResult>> {
  const now = deps.now ?? new Date();
  const [account] = await db.select().from(creatorAccounts).where(eq(creatorAccounts.id, accountId)).limit(1);
  if (!account) return { ok: false, error: 'Compte introuvable.' };
  const set = (values: Partial<typeof creatorAccounts.$inferInsert>) =>
    db.update(creatorAccounts).set({ ...values, updatedAt: now }).where(eq(creatorAccounts.id, accountId));
  const verify = async (): Promise<Parsed<ClaimResult>> => {
    await set({ claimStatus: 'verified', claimMethod: 'bio_code', claimedAt: now, claimCode: null, claimCodeAt: null, lastRecheckedAt: now });
    return { ok: true, data: { status: 'verified', code: null, found: true } };
  };
  const pending = account.claimStatus === 'pending' && account.claimCode && account.claimCodeAt;
  // Garde-fou : la preuve ne vaut que si l'admin a d'abord contrôlé que ce compte est le bon (pas une copie).
  const unchecked: Parsed<ClaimResult> = { ok: false, error: 'Contrôle d’abord ce compte (coche « J’ai contrôlé ce compte ») : la preuve ne vaut que pour le vrai compte du créateur.' };

  switch (action) {
    case 'start': {
      if (account.claimStatus === 'verified') return { ok: false, error: 'Ce compte est déjà prouvé par le créateur.' };
      if (!account.adminCheckedAt) return unchecked;
      const code = (deps.newCode ?? newClaimCode)();
      await set({ claimStatus: 'pending', claimMethod: 'bio_code', claimCode: code, claimCodeAt: now });
      return { ok: true, data: { status: 'pending', code } };
    }
    case 'check': {
      if (!pending) return { ok: false, error: 'Aucune preuve en cours sur ce compte.' };
      if (!account.adminCheckedAt) return unchecked;
      if (claimCodeExpired(account.claimCodeAt!, now)) return { ok: false, error: `Le code a plus de ${CLAIM_CODE_DAYS} jours : donne-lui un nouveau code.` };
      if (account.platform !== 'youtube' || !account.externalId) return { ok: false, error: 'Merkod ne lit que les bios YouTube : regarde le profil toi-même, puis confirme.' };
      if (!deps.readDescription) return { ok: false, error: 'La clé YouTube (YOUTUBE_API_KEY) manque : la bio ne peut pas être lue.' };
      let description: string | null;
      try { description = await deps.readDescription(account.externalId); } catch { return { ok: false, error: 'YouTube ne répond pas. Réessaie dans un moment.' }; }
      if (description === null) return { ok: false, error: 'Cette chaîne n’existe plus sur YouTube.' };
      if (bioContainsCode(description, account.claimCode!)) return verify();
      await set({ lastRecheckedAt: now });
      return { ok: true, data: { status: 'pending', code: account.claimCode, found: false } };
    }
    case 'confirm': {
      if (!pending) return { ok: false, error: 'Aucune preuve en cours sur ce compte.' };
      if (!account.adminCheckedAt) return unchecked;
      if (claimCodeExpired(account.claimCodeAt!, now)) return { ok: false, error: `Le code a plus de ${CLAIM_CODE_DAYS} jours : donne-lui un nouveau code.` };
      return verify();
    }
    case 'cancel': {
      if (account.claimStatus !== 'pending') return { ok: false, error: 'Aucune preuve en cours sur ce compte.' };
      await set({ claimStatus: 'none', claimMethod: null, claimCode: null, claimCodeAt: null });
      return { ok: true, data: { status: 'none', code: null } };
    }
    case 'revoke': {
      if (account.claimStatus !== 'verified') return { ok: false, error: 'Ce compte n’est pas prouvé par le créateur.' };
      await set({ claimStatus: 'revoked', claimCode: null, claimCodeAt: null });
      return { ok: true, data: { status: 'revoked', code: null } };
    }
  }
}
