// Récupère la photo de profil YouTube des créateurs et l'enregistre dans public/avatars/.
// Comme les logos (ADR-0007), les images sont servies par Koupi : le navigateur des visiteurs
// n'envoie aucune requête à Google.
//
// Étapes : vidéo source de chaque code public → chaîne (videos.list) → photo (channels.list).
// Coût en quota YouTube : 1 unité par lot de 50 vidéos + 1 unité par lot de 50 chaînes.
//
// Usage : npm run avatars -- [--force]
// Besoin de YOUTUBE_API_KEY dans .env.local (jamais dans le dépôt).
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/** Vrai quand le fichier est lancé directement (node script.mjs), y compris sous Windows. */
function isMainScript() {
  return Boolean(process.argv[1]) && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
}

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT_DIR = path.join(ROOT, 'public', 'avatars');
const MANIFEST = path.join(ROOT, 'lib', 'creator-avatars.json');
const API = 'https://www.googleapis.com/youtube/v3';
const MAX_BYTES = 150_000;
const KEY = process.env.YOUTUBE_API_KEY?.trim();
const force = process.argv.includes('--force');

/** Même règle que creatorSlug() dans lib/ui.ts. */
export function creatorSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

/** Identifiant de vidéo d'une URL YouTube (watch?v=, youtu.be/, shorts/), sinon null. */
export function videoId(url) {
  const match = String(url).match(/(?:[?&]v=|youtu\.be\/|\/shorts\/)([\w-]{11})/);
  return match ? match[1] : null;
}

function chunks(list, size) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

async function get(endpoint, params) {
  const response = await fetch(`${API}/${endpoint}?${new URLSearchParams({ ...params, key: KEY })}`);
  if (!response.ok) throw new Error(`${endpoint} ${response.status}: ${(await response.text()).slice(0, 200)}`);
  return response.json();
}

async function main() {
  if (!KEY) { console.error('YOUTUBE_API_KEY absent : ajoute-la dans .env.local.'); process.exit(1); }
  const catalog = JSON.parse(await readFile(path.join(ROOT, 'lib', 'catalog.json'), 'utf8'));
  const manifest = existsSync(MANIFEST) ? JSON.parse(await readFile(MANIFEST, 'utf8')) : {};
  const isPublic = code => code.status === 'verified' || code.status === 'to_test';

  // Créateur → une vidéo source YouTube.
  const videoByCreator = new Map();
  for (const code of catalog.codes.filter(isPublic)) {
    const slug = creatorSlug(code.creator);
    const id = videoId(code.source);
    if (!id || videoByCreator.has(slug) || (manifest[slug] && !force)) continue;
    videoByCreator.set(slug, id);
  }
  if (videoByCreator.size === 0) { console.log('Tous les avatars sont déjà là (--force pour tout refaire).'); return; }

  // Vidéo → chaîne.
  const channelByVideo = new Map();
  for (const ids of chunks([...new Set(videoByCreator.values())], 50)) {
    const body = await get('videos', { part: 'snippet', id: ids.join(',') });
    for (const item of body.items ?? []) channelByVideo.set(item.id, item.snippet.channelId);
  }

  // Chaîne → photo.
  const photoByChannel = new Map();
  for (const ids of chunks([...new Set(channelByVideo.values())], 50)) {
    const body = await get('channels', { part: 'snippet', id: ids.join(',') });
    for (const item of body.items ?? []) {
      const thumbs = item.snippet.thumbnails ?? {};
      const url = (thumbs.medium ?? thumbs.default ?? thumbs.high)?.url;
      if (url) photoByChannel.set(item.id, url);
    }
  }

  await mkdir(OUT_DIR, { recursive: true });
  let saved = 0;
  for (const [slug, video] of videoByCreator) {
    const channelId = channelByVideo.get(video);
    const url = channelId && photoByChannel.get(channelId);
    if (!url) { console.log(`${slug} : pas de photo trouvée, l'initiale sera affichée.`); continue; }
    try {
      const response = await fetch(url);
      const type = response.headers.get('content-type') ?? '';
      if (!response.ok || !type.startsWith('image/')) throw new Error(`réponse ${response.status} ${type}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length > MAX_BYTES) throw new Error(`image trop lourde (${bytes.length} octets)`);
      const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg';
      await writeFile(path.join(OUT_DIR, `${slug}.${ext}`), bytes);
      manifest[slug] = { src: `/avatars/${slug}.${ext}`, channelId };
      saved++;
      console.log(`${slug} : ok`);
    } catch (error) {
      console.log(`${slug} : échec (${error.message}), l'initiale sera affichée.`);
    }
  }
  const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)));
  await writeFile(MANIFEST, JSON.stringify(sorted, null, 2) + '\n');
  console.log(`\n${saved} avatar(s) enregistré(s) dans public/avatars/.`);
}

if (isMainScript()) main().catch(error => { console.error(error.message); process.exit(1); });
