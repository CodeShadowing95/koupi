// Podcasts candidats depuis la base publique de Podcast Index (ADR-0036). Lancé chaque semaine par la GitHub Action
// .github/workflows/podcast-index.yml, qui télécharge la base (plusieurs Go : trop gros pour Vercel).
//
//   npx tsx scripts/podcast-index-candidates.ts [podcastindex_feeds.db] [--dry-run] [--limit 10000]
//
// Variables : MERKOD_URL (adresse du site, ex. https://merkod.vercel.app) et CRON_SECRET (le même que sur Vercel).
// Sans base téléchargée (le site de Podcast Index peut refuser le téléchargement), le script passe par l'API officielle
// avec PODCASTINDEX_API_KEY et PODCASTINDEX_API_SECRET : moins de podcasts (tendances et flux récents), mêmes conditions.
// 1. Merkod donne les outils du catalogue et les podcasts déjà suivis.
// 2. La base (ou l'API) donne les podcasts actifs, en français ou en anglais, toutes catégories, les plus populaires d'abord.
// 3. Leurs flux RSS sont lus ; un podcast qui cite un outil du catalogue près d'un code devient candidat.
// 4. Les candidats sont envoyés à Merkod (sauf avec --dry-run, qui les affiche).
// La base est lue avec le module SQLite intégré à Node (node:sqlite) : aucune dépendance ajoutée.
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import type { CatalogTool } from '../lib/podcast-codes';
import { apiFeedToFeed, candidateQuery, dumpRowToFeed, MAX_CANDIDATES, MAX_FEEDS, parseFeedItems, scanFeed, type CandidateInput, type IndexFeed } from '../lib/podcast-index';

const CONCURRENCY = 24;
const FEED_TIMEOUT_MS = 15_000;
const FEED_MAX_BYTES = 4_000_000;

const args = process.argv.slice(2);
const dbPath = args.find(arg => !arg.startsWith('--') && !/^\d+$/.test(arg));
const dryRun = args.includes('--dry-run');
const limitIndex = args.indexOf('--limit');
const limit = limitIndex >= 0 ? Number(args[limitIndex + 1]) : MAX_FEEDS;
const base = (process.env.MERKOD_URL ?? '').replace(/\/+$/, '');
const secret = process.env.CRON_SECRET ?? '';

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

const apiKey = process.env.PODCASTINDEX_API_KEY ?? '';
const apiSecret = process.env.PODCASTINDEX_API_SECRET ?? '';
const useDump = Boolean(dbPath && existsSync(dbPath));
if (!useDump && !(apiKey && apiSecret)) fail('Ni base téléchargée ni clés de l’API (PODCASTINDEX_API_KEY, PODCASTINDEX_API_SECRET) : rien à lire.');
if (!/^(https:\/\/|http:\/\/localhost[:/])/.test(base) || !secret) fail('MERKOD_URL (https://…) et CRON_SECRET sont nécessaires.');
if (!Number.isSafeInteger(limit) || limit < 1) fail('--limit doit être un nombre positif.');

const headers = { authorization: `Bearer ${secret}`, 'user-agent': 'Merkod podcast candidates (+https://github.com/CodeShadowing95/koupi)' };

/** Le flux RSS, coupé à FEED_MAX_BYTES et abandonné après FEED_TIMEOUT_MS. null si le flux ne répond pas. */
async function fetchFeed(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { headers: { 'user-agent': headers['user-agent'], accept: 'application/rss+xml, application/xml, text/xml, */*' }, signal: AbortSignal.timeout(FEED_TIMEOUT_MS), redirect: 'follow' });
    if (!response.ok || !response.body) return null;
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > FEED_MAX_BYTES) { await reader.cancel(); break; }
      chunks.push(value);
    }
    return Buffer.concat(chunks).toString('utf8');
  } catch {
    return null;
  }
}

/** Podcasts de la base téléchargée. */
function feedsFromDump(now: Date): IndexFeed[] {
  const db = new DatabaseSync(dbPath!, { readOnly: true });
  const query = candidateQuery(now, limit);
  const rows = db.prepare(query.sql).all(...query.params) as Record<string, unknown>[];
  db.close();
  return rows.map(dumpRowToFeed);
}

/**
 * Podcasts de l'API officielle (https://podcastindex-org.github.io/docs-api/) : les tendances et les flux mis à jour
 * récemment, 1 000 de chaque au plus. Signature : sha1(clé + secret + date Unix), envoyée avec la clé et la date.
 */
async function feedsFromApi(now: Date): Promise<IndexFeed[]> {
  const get = async (path: string): Promise<Record<string, unknown>[]> => {
    const date = String(Math.floor(Date.now() / 1000));
    const response = await fetch(`https://api.podcastindex.org/api/1.0${path}`, { headers: {
      'User-Agent': headers['user-agent'], 'X-Auth-Key': apiKey, 'X-Auth-Date': date,
      Authorization: createHash('sha1').update(apiKey + apiSecret + date).digest('hex'),
    }, signal: AbortSignal.timeout(60_000) });
    if (!response.ok) throw new Error(`API Podcast Index ${path} : ${response.status}`);
    const body = await response.json() as { feeds?: Record<string, unknown>[] };
    return body.feeds ?? [];
  };
  const raw = [...await get('/podcasts/trending?max=1000&lang=fr,en'), ...await get('/recent/feeds?max=1000&lang=fr,en')];
  const seen = new Set<string>();
  return raw.flatMap(feed => {
    const item = apiFeedToFeed(feed, now);
    if (!item || seen.has(item.itunesId)) return [];
    seen.add(item.itunesId);
    return [item];
  }).slice(0, limit);
}

async function main() {
  const now = new Date();
  const catalogResponse = await fetch(`${base}/api/cron/podcast-index`, { headers });
  if (!catalogResponse.ok) fail(`Merkod a refusé la demande du catalogue (${catalogResponse.status}).`);
  const catalog = await catalogResponse.json() as { tools: CatalogTool[]; followed: string[] };
  const followed = new Set(catalog.followed);
  console.log(`Catalogue : ${catalog.tools.length} outils, ${followed.size} podcasts déjà suivis.`);

  const rows = (useDump ? feedsFromDump(now) : await feedsFromApi(now)).filter(row => !followed.has(row.itunesId));
  console.log(`${useDump ? 'Base Podcast Index' : 'API Podcast Index (base non téléchargée)'} : ${rows.length} podcasts actifs à lire.`);

  const candidates: CandidateInput[] = [];
  let read = 0;
  let unreachable = 0;
  let next = 0;
  async function worker() {
    while (next < rows.length) {
      const row = rows[next++];
      const xml = await fetchFeed(row.url);
      read++;
      if (read % 250 === 0) console.log(`  ${read} / ${rows.length} flux lus, ${candidates.length} candidats`);
      if (!xml) { unreachable++; continue; }
      const hits = scanFeed(parseFeedItems(xml), catalog.tools, now);
      if (!hits.length) continue;
      candidates.push({
        itunesId: row.itunesId, podcastIndexId: row.id, title: row.title, author: row.author, feedUrl: row.url, imageUrl: row.imageUrl,
        language: row.language, category: row.category, episodeCount: row.episodeCount, newestEpisodeAt: row.newestAt, hits,
      });
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  candidates.sort((a, b) => b.hits.length - a.hits.length);
  const kept = candidates.slice(0, MAX_CANDIDATES);
  console.log(`Flux lus : ${read} (${unreachable} sans réponse). Candidats : ${candidates.length}${candidates.length > kept.length ? `, ${kept.length} envoyés` : ''}.`);

  if (dryRun) {
    for (const item of kept.slice(0, 30)) console.log(`- ${item.title} (${item.language}, ${item.category}) : ${item.hits.map(hit => hit.code).join(', ')}`);
    return;
  }
  const response = await fetch(`${base}/api/cron/podcast-index`, { method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify({ candidates: kept }) });
  const body = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) fail(`Merkod a refusé les candidats (${response.status}) : ${String(body.error ?? '')}`);
  console.log(`Merkod : ${String(body.valid)} candidats valides, ${String(body.saved)} enregistrés, ${String(body.followed)} déjà suivis.`);
}

main().catch(error => fail(`Échec : ${error instanceof Error ? error.message : String(error)}`));
