// Début du flux RSS d'un podcast : sa langue (<language>) et sa description, sans télécharger tous les épisodes.
// L'adresse du flux vient de l'annuaire Apple : mêmes garde-fous que la lecture d'un site (lib/site-reader.ts) :
// https, nom de domaine public, jamais un réseau privé, redirections vérifiées, taille et temps limités.
import { lookup } from 'node:dns/promises';
import { htmlToText } from './apple-podcasts';
import { normalizeLanguage } from './language-guess';
import { isPrivateAddress, safeSiteUrl } from './site-reader';

const HEAD_BYTES = 64 * 1024;

export type FeedHead = { language: string | null; description: string };

/** Lit la langue et la description de l'émission dans le début d'un flux RSS. */
export function parseFeedHead(xml: string): FeedHead {
  const channel = xml.split(/<item[\s>]/i)[0];
  const language = normalizeLanguage(channel.match(/<language>\s*([^<]{2,12})\s*<\/language>/i)?.[1]);
  const raw = channel.match(/<description>([\s\S]{1,4000}?)<\/description>/i)?.[1]
    ?? channel.match(/<itunes:summary>([\s\S]{1,4000}?)<\/itunes:summary>/i)?.[1] ?? '';
  const description = htmlToText(raw.replace(/^\s*<!\[CDATA\[|\]\]>\s*$/g, '')).slice(0, 2000);
  return { language, description };
}

type Resolve = (host: string) => Promise<string[]>;
const resolveAll: Resolve = async host => (await lookup(host, { all: true })).map(entry => entry.address);
const MAX_REDIRECTS = 3;

/** Lit les 64 premiers Ko du flux. null si l'adresse est refusée ou si le flux ne répond pas. */
export async function fetchFeedHead(feedUrl: string, deps: { fetchFn?: typeof fetch; resolve?: Resolve } = {}): Promise<FeedHead | null> {
  const fetchFn = deps.fetchFn ?? fetch;
  const resolve = deps.resolve ?? resolveAll;
  if (!/^https:\/\//i.test(feedUrl)) return null;
  let url = safeSiteUrl(feedUrl);
  for (let hop = 0; url && hop <= MAX_REDIRECTS; hop++) {
    const addresses = await resolve(url.hostname).catch(() => [] as string[]);
    if (addresses.length === 0 || addresses.some(isPrivateAddress)) return null;
    const response = await fetchFn(url, { redirect: 'manual', cache: 'no-store', signal: AbortSignal.timeout(8000) }).catch(() => null);
    if (!response) return null;
    if (response.status >= 300 && response.status < 400) {
      const next = response.headers.get('location');
      url = next ? safeSiteUrl(new URL(next, url).toString()) : null;
      continue;
    }
    if (!response.ok || !response.body) return null;
    return parseFeedHead(await readHead(response.body));
  }
  return null;
}

async function readHead(body: ReadableStream<Uint8Array>): Promise<string> {
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (size < HEAD_BYTES) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      chunks.push(value);
      size += value.length;
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
  return new TextDecoder().decode(Buffer.concat(chunks).subarray(0, HEAD_BYTES));
}
