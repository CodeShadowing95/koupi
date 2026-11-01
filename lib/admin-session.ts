// Session admin : le cookie contient une date d'expiration signée en HMAC-SHA256 avec SESSION_SECRET.
// Sans le secret, impossible de fabriquer un cookie valide. Web Crypto marche dans le middleware (Edge) et dans Node.

export const ADMIN_COOKIE = 'koupi_admin';
export const ADMIN_SESSION_SECONDS = 60 * 60 * 12;

const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return toBase64Url(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(payload))));
}

// Comparaison à temps constant pour ne rien révéler de la signature attendue.
export function safeEqual(a: string, b: string): boolean {
  const left = encoder.encode(a), right = encoder.encode(b);
  let diff = left.length ^ right.length;
  for (let i = 0; i < Math.max(left.length, right.length); i++) diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  return diff === 0;
}

export async function createAdminToken(secret: string, now = Date.now()): Promise<string> {
  const expires = String(Math.floor(now / 1000) + ADMIN_SESSION_SECONDS);
  return `${expires}.${await sign(expires, secret)}`;
}

export async function verifyAdminToken(token: string | undefined, secret: string | undefined, now = Date.now()): Promise<boolean> {
  if (!token || !secret) return false;
  const [expires, signature, extra] = token.split('.');
  if (!expires || !signature || extra !== undefined || !/^\d+$/.test(expires)) return false;
  if (Number(expires) <= Math.floor(now / 1000)) return false;
  return safeEqual(signature, await sign(expires, secret));
}
