// Vérification côté serveur du jeton Cloudflare Turnstile (anti-robot du formulaire de proposition).
// Doc : https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const MAX_TOKEN_LENGTH = 2048;

type Fetcher = (url: string, init: RequestInit) => Promise<Response>;

export async function verifyTurnstile(token: string, secret: string, ip: string, fetcher: Fetcher = fetch): Promise<boolean> {
  if (!token || token.length > MAX_TOKEN_LENGTH) return false;
  const body = new URLSearchParams({ secret, response: token });
  if (ip && ip !== 'unknown') body.set('remoteip', ip);
  try {
    const response = await fetcher(SITEVERIFY_URL, { method: 'POST', body, signal: AbortSignal.timeout(5000) });
    if (!response.ok) return false;
    const result = await response.json() as { success?: unknown };
    return result.success === true;
  } catch (error) {
    console.error('turnstile verification failed', error);
    return false;
  }
}
