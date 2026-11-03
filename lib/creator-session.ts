// Session d'un créateur connecté (ADR-0021) : « id.expiration.signature », signé en HMAC-SHA256.
// La clé dérive de SESSION_SECRET avec un préfixe : un cookie créateur ne peut jamais servir de cookie admin.
import { safeEqual, sign } from './admin-session';

export const CREATOR_COOKIE = 'koupi_creator';
export const CREATOR_SESSION_SECONDS = 60 * 60 * 24 * 30;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const payloadOf = (userId: string, expires: string) => `creator:${userId}:${expires}`;

export async function createCreatorToken(userId: string, secret: string, now = Date.now()): Promise<string> {
  const expires = String(Math.floor(now / 1000) + CREATOR_SESSION_SECONDS);
  return `${userId}.${expires}.${await sign(payloadOf(userId, expires), secret)}`;
}

/** L'id du créateur connecté, ou null si le cookie est absent, falsifié ou expiré. */
export async function readCreatorToken(token: string | undefined, secret: string | undefined, now = Date.now()): Promise<string | null> {
  if (!token || !secret) return null;
  const [userId, expires, signature, extra] = token.split('.');
  if (!userId || !expires || !signature || extra !== undefined || !UUID.test(userId) || !/^\d+$/.test(expires)) return null;
  if (Number(expires) <= Math.floor(now / 1000)) return null;
  return safeEqual(signature, await sign(payloadOf(userId, expires), secret)) ? userId : null;
}
