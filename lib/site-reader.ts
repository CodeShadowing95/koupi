// Lecture de la page d'accueil d'un outil, pour que l'IA dise ce qu'il fait (ADR-0024).
// L'adresse vient de notes de podcasts : on ne suit qu'une page publique en https, jamais une adresse IP,
// un nom local ou une adresse qui pointe vers un réseau privé, avec un temps et une taille limités.
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

export const MAX_SITE_BYTES = 400_000;
export const MAX_SITE_TEXT = 6_000;
const TIMEOUT_MS = 8_000;
const MAX_REDIRECTS = 3;

export type SitePage = { url: string; title: string; description: string; text: string };

/** Adresse IP d'un réseau privé, local ou réservé (IPv4 et IPv6). */
export function isPrivateAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const [a, b] = address.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || (a === 198 && (b === 18 || b === 19));
  }
  const ip = address.toLowerCase();
  if (ip.startsWith('::ffff:')) return isPrivateAddress(ip.slice(7));
  return ip === '::' || ip === '::1' || ip.startsWith('fc') || ip.startsWith('fd') || ip.startsWith('fe8') || ip.startsWith('fe9')
    || ip.startsWith('fea') || ip.startsWith('feb') || ip.startsWith('ff');
}

/** Une adresse qu'on accepte de lire : https, port par défaut, un vrai nom de domaine public. */
export function safeSiteUrl(raw: string): URL | null {
  let url: URL;
  try { url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`); } catch { return null; }
  if (url.protocol === 'http:') url.protocol = 'https:';
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) return null;
  const host = url.hostname.toLowerCase();
  if (isIP(host.replace(/^\[|\]$/g, '')) || !/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host)) return null;
  if (/(^|\.)(localhost|local|internal|intranet|lan|home|corp|test|invalid|example)$/.test(host)) return null;
  return url;
}

type Resolve = (host: string) => Promise<string[]>;
const resolveAll: Resolve = async host => (await lookup(host, { all: true })).map(entry => entry.address);

const decode = (value: string) => value
  .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, '\'')
  .replace(/&#(\d+);/g, (_, code: string) => { const n = Number(code); return n > 0 && n < 0x110000 ? String.fromCodePoint(n) : ' '; })
  .replace(/&amp;/g, '&');

function meta(html: string, name: string): string {
  const tag = html.match(new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]*>`, 'i'))?.[0];
  return decode(tag?.match(/content=["']([^"']*)["']/i)?.[1] ?? '').trim();
}

/** Titre, description et texte visible d'une page HTML (sans scripts, styles ni menus). */
export function pageText(html: string): Omit<SitePage, 'url'> {
  const title = decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '').replace(/\s+/g, ' ').trim().slice(0, 200);
  const description = (meta(html, 'description') || meta(html, 'og:description')).slice(0, 500);
  const body = html
    .replace(/<head[\s>][\s\S]*?<\/head>/i, ' ')
    .replace(/<(script|style|noscript|svg|template|iframe|title)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<(nav|footer)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<\s*(br|\/p|\/li|\/div|\/h[1-6]|\/section)\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');
  const text = decode(body).replace(/[ \t\r]+/g, ' ').replace(/ *\n\s*/g, '\n').trim().slice(0, MAX_SITE_TEXT);
  return { title, description, text };
}

async function readLimited(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return '';
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (size < MAX_SITE_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.byteLength;
  }
  await reader.cancel().catch(() => undefined);
  const all = new Uint8Array(Math.min(size, MAX_SITE_BYTES));
  let offset = 0;
  for (const chunk of chunks) { const part = chunk.subarray(0, all.length - offset); all.set(part, offset); offset += part.length; if (offset >= all.length) break; }
  return new TextDecoder('utf-8', { fatal: false }).decode(all);
}

/** Lit la page d'accueil d'un site. Rend une erreur lisible par l'admin plutôt que de lever. */
export async function readSite(raw: string, deps: { fetchFn?: typeof fetch; resolve?: Resolve } = {}): Promise<{ ok: true; page: SitePage } | { ok: false; error: string }> {
  const fetchFn = deps.fetchFn ?? fetch;
  const resolve = deps.resolve ?? resolveAll;
  const first = safeSiteUrl(raw);
  if (!first) return { ok: false, error: 'Adresse du site refusée : il faut un nom de domaine public en https.' };
  let url: URL = first;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    let addresses: string[];
    try { addresses = await resolve(url.hostname); } catch { return { ok: false, error: `Le site ${url.hostname} est introuvable.` }; }
    if (addresses.length === 0 || addresses.some(isPrivateAddress)) return { ok: false, error: 'Adresse du site refusée : elle ne mène pas à un site public.' };
    let response: Response;
    try {
      response = await fetchFn(url, {
        redirect: 'manual', cache: 'no-store', signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { accept: 'text/html,application/xhtml+xml', 'accept-language': 'fr,en;q=0.8', 'user-agent': 'MerkodBot/1.0 (+https://koupi.vercel.app)' },
      });
    } catch {
      return { ok: false, error: `Le site ${url.hostname} ne répond pas.` };
    }
    if (response.status >= 300 && response.status < 400) {
      const next = response.headers.get('location');
      const target: URL | null = next ? safeSiteUrl(new URL(next, url).toString()) : null;
      if (!target) return { ok: false, error: 'Le site redirige vers une adresse refusée.' };
      url = target;
      continue;
    }
    if (!response.ok) return { ok: false, error: `Le site ${url.hostname} a répondu ${response.status}.` };
    if (!/text\/html|application\/xhtml/i.test(response.headers.get('content-type') ?? '')) return { ok: false, error: 'Le site ne renvoie pas une page web.' };
    const page = pageText(await readLimited(response));
    if (!page.title && !page.description && page.text.length < 40) return { ok: false, error: 'La page du site est vide (elle s’affiche peut-être seulement avec JavaScript).' };
    return { ok: true, page: { url: url.toString(), ...page } };
  }
  return { ok: false, error: 'Le site redirige trop de fois.' };
}
