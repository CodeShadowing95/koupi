// Récupère les logos des outils et les enregistre dans public/logos/.
// Les logos sont servis par Koupi lui-même : aucune requête vers un service tiers
// depuis le navigateur des visiteurs (voir ADR-0007).
//
// Ordre de recherche pour chaque outil :
//   1. Logo.dev, si LOGO_DEV_TOKEN est défini (clé publishable, dans .env.local, jamais dans le dépôt) ;
//   2. Simple Icons (licence CC0) : glyphe SVG + couleur officielle de la marque ;
//   3. l'icône déclarée par le site officiel (apple-touch-icon, puis icon, puis /favicon.ico).
// Sans logo trouvé, le site affiche l'initiale (repli).
//
// Usage : npm run logos -- [--force] [--only slug1,slug2]
//   SIMPLE_ICONS_DIR=/chemin/vers/simple-icons  pour lire un paquet simple-icons déjà extrait.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT_DIR = path.join(ROOT, 'public', 'logos');
const MANIFEST = path.join(ROOT, 'lib', 'tool-logos.json');
const SIMPLE_ICONS_VERSION = '16.36.0';
const SIMPLE_ICONS_CDN = `https://cdn.jsdelivr.net/npm/simple-icons@${SIMPLE_ICONS_VERSION}`;
const MAX_BYTES = 200_000;
const LOGO_DEV_TOKEN = process.env.LOGO_DEV_TOKEN?.trim();
const args = process.argv.slice(2);
const force = args.includes('--force');
const onlyIndex = args.indexOf('--only');
const only = onlyIndex >= 0 ? new Set(args[onlyIndex + 1].split(',')) : null;

/** Lit les outils publiés (slug, nom, site) dans lib/catalog.json, généré par `npm run catalog`. */
async function readTools() {
  const catalog = JSON.parse(await readFile(path.join(ROOT, 'lib', 'catalog.json'), 'utf8'));
  return catalog.tools.map(({ slug, name, website }) => ({ slug, name, website }));
}

/** Règle de slug de Simple Icons : minuscules, + → plus, . → dot, le reste retiré. */
function simpleIconsSlug(title) {
  return title.toLowerCase().replace(/\+/g, 'plus').replace(/\./g, 'dot').normalize('NFD').replace(/[^a-z0-9]/g, '');
}

async function loadSimpleIcons() {
  const dir = process.env.SIMPLE_ICONS_DIR;
  if (dir) {
    const data = JSON.parse(await readFile(path.join(dir, 'data', 'simple-icons.json'), 'utf8'));
    return { list: Array.isArray(data) ? data : data.icons, svg: slug => readFile(path.join(dir, 'icons', `${slug}.svg`), 'utf8').catch(() => null) };
  }
  try {
    const response = await fetch(`${SIMPLE_ICONS_CDN}/data/simple-icons.json`);
    if (!response.ok) throw new Error(String(response.status));
    const data = await response.json();
    return {
      list: Array.isArray(data) ? data : data.icons,
      svg: async slug => {
        const r = await fetch(`${SIMPLE_ICONS_CDN}/icons/${slug}.svg`);
        return r.ok ? r.text() : null;
      },
    };
  } catch (error) {
    console.warn(`Simple Icons indisponible (${error.message}), on passe aux sites officiels.`);
    return { list: [], svg: async () => null };
  }
}

/** Le glyphe Simple Icons, en blanc, à poser sur un disque de la couleur de la marque. */
function whiteGlyph(svg) {
  return svg.replace(/<title>.*?<\/title>/s, '').replace('<svg ', '<svg fill="#ffffff" ');
}

function isLight(hex) {
  const n = parseInt(hex, 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b > 186;
}

const EXT = { 'image/svg+xml': 'svg', 'image/png': 'png', 'image/x-icon': 'ico', 'image/vnd.microsoft.icon': 'ico', 'image/webp': 'webp', 'image/jpeg': 'jpg' };

/** L'icône déclarée par le site officiel (la plus grande trouvée). */
async function fromWebsite(tool) {
  const page = await fetch(tool.website, { redirect: 'follow', headers: { 'user-agent': 'KoupiLogoBot/1.0 (+https://github.com/CodeShadowing95/koupi)' } });
  if (!page.ok) throw new Error(`page ${page.status}`);
  const html = await page.text();
  const base = page.url;
  const candidates = [];
  for (const tag of html.matchAll(/<link\b[^>]*>/gi)) {
    const rel = /rel=["']([^"']+)["']/i.exec(tag[0])?.[1].toLowerCase() ?? '';
    const href = /href=["']([^"']+)["']/i.exec(tag[0])?.[1];
    if (!href || !/(apple-touch-icon|icon)/.test(rel) || rel.includes('mask-icon')) continue;
    const size = Number(/sizes=["'](\d+)x\d+["']/i.exec(tag[0])?.[1] ?? (rel.includes('apple') ? 180 : 32));
    candidates.push({ url: new URL(href, base).href, score: size + (href.endsWith('.svg') ? 1000 : 0) });
  }
  candidates.push({ url: new URL('/favicon.ico', base).href, score: 1 });
  candidates.sort((a, b) => b.score - a.score);
  for (const candidate of candidates) {
    const response = await fetch(candidate.url).catch(() => null);
    if (!response?.ok) continue;
    const type = (response.headers.get('content-type') ?? '').split(';')[0].trim();
    const ext = EXT[type];
    const body = Buffer.from(await response.arrayBuffer());
    if (!ext || body.length === 0 || body.length > MAX_BYTES) continue;
    return { ext, body, source: candidate.url };
  }
  throw new Error('aucune icône exploitable');
}

/** Logo.dev : l'icône carrée de la marque, en PNG 128 px. 404 si la marque est inconnue (pas de monogramme). */
async function fromLogoDev(tool) {
  const domain = new URL(tool.website).hostname.replace(/^www\./, '');
  const url = `https://img.logo.dev/${encodeURIComponent(domain)}?token=${encodeURIComponent(LOGO_DEV_TOKEN)}&size=128&format=png&retina=true&fallback=404`;
  // On n'affiche jamais l'URL : elle contient la clé.
  const response = await fetch(url).catch(() => null);
  if (!response) throw new Error('Logo.dev injoignable');
  if (!response.ok) throw new Error(`Logo.dev ${response.status}`);
  const type = (response.headers.get('content-type') ?? '').split(';')[0].trim();
  const body = Buffer.from(await response.arrayBuffer());
  if (!EXT[type] || body.length === 0 || body.length > MAX_BYTES) throw new Error('Logo.dev : réponse inattendue');
  return { ext: EXT[type], body };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const manifest = existsSync(MANIFEST) ? JSON.parse(await readFile(MANIFEST, 'utf8')) : {};
  const tools = (await readTools()).filter(tool => !only || only.has(tool.slug));
  const icons = await loadSimpleIcons();
  if (!LOGO_DEV_TOKEN) console.log('LOGO_DEV_TOKEN absent : Logo.dev est ignoré.');

  for (const tool of tools) {
    if (manifest[tool.slug] && !force) { console.log(`= ${tool.slug} (déjà là)`); continue; }
    if (LOGO_DEV_TOKEN) {
      try {
        const found = await fromLogoDev(tool);
        await writeFile(path.join(OUT_DIR, `${tool.slug}.${found.ext}`), found.body);
        manifest[tool.slug] = { src: `/logos/${tool.slug}.${found.ext}`, bg: '#ffffff', kind: 'image', source: 'Logo.dev' };
        console.log(`✓ ${tool.slug} : Logo.dev`);
        continue;
      } catch (error) {
        console.log(`· ${tool.slug} : ${error.message}, on essaie la suite`);
      }
    }
    const wanted = new Set([simpleIconsSlug(tool.name), tool.slug.replace(/-/g, '')]);
    const icon = icons.list.find(item => wanted.has(item.slug ?? simpleIconsSlug(item.title)));
    const glyph = icon ? await icons.svg(icon.slug ?? simpleIconsSlug(icon.title)) : null;
    if (icon && glyph) {
      await writeFile(path.join(OUT_DIR, `${tool.slug}.svg`), whiteGlyph(glyph));
      const bg = `#${icon.hex}`;
      manifest[tool.slug] = { src: `/logos/${tool.slug}.svg`, bg: isLight(icon.hex) ? '#17150F' : bg, kind: 'glyph', source: `Simple Icons (CC0) : ${icon.source}` };
      console.log(`✓ ${tool.slug} : Simple Icons`);
      continue;
    }
    try {
      const found = await fromWebsite(tool);
      await writeFile(path.join(OUT_DIR, `${tool.slug}.${found.ext}`), found.body);
      manifest[tool.slug] = { src: `/logos/${tool.slug}.${found.ext}`, bg: '#ffffff', kind: 'image', source: found.source };
      console.log(`✓ ${tool.slug} : site officiel`);
    } catch (error) {
      console.log(`✗ ${tool.slug} : ${error.message} (repli sur l'initiale)`);
    }
  }

  const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)));
  await writeFile(MANIFEST, `${JSON.stringify(sorted, null, 2)}\n`);
}

await main();
