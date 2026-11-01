// Construit lib/catalog.json à partir des données de sourcing.
//
// Entrées :
// - data/outils-v0.csv : les outils suivis (nom, catégorie, site).
// - data/candidats-tous.csv : les codes trouvés sur YouTube, avec le premier tri (colonne « proposition »).
// - data/catalogue-manuel.json : ce qui a été saisi à la main (descriptions d'outils, statut, réduction, votes).
//
// Sortie : lib/catalog.json, lu par lib/data.ts (site public et admin).
// Usage : npm run catalog
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/** Vrai quand le fichier est lancé directement (node script.mjs), y compris sous Windows. */
function isMainScript() {
  return Boolean(process.argv[1]) && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
}

export function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some(value => value !== '')) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some(value => value !== '')) rows.push(row);
  const [head, ...data] = rows;
  return data.map(values => Object.fromEntries(head.map((key, i) => [key.trim(), (values[i] ?? '').trim()])));
}

export function slugify(value) {
  return value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** Statut d'un candidat selon le premier tri : « ok probable » → à tester, « à vérifier » → en attente, « non » → rejeté. */
export function statusFromProposal(proposal) {
  const value = proposal.toLowerCase();
  if (value.startsWith('ok')) return 'to_test';
  if (value.startsWith('non')) return 'rejected';
  return 'pending';
}

/** Une réduction lisible tirée de l'extrait de description, sinon un libellé neutre. */
export function discountFromExcerpt(excerpt) {
  const months = excerpt.match(/(\d+)\s*mois\s+offerts?/i) || excerpt.match(/(\d+)\s*(?:free|extra)\s+months?/i);
  const percent = excerpt.match(/(\d{1,2})\s?%/);
  if (percent && months) return `-${percent[1]} % + ${months[1]} mois offerts`;
  if (percent) return `-${percent[1]} %`;
  if (months) return `${months[1]} mois offerts`;
  return 'Offre du créateur';
}

export function buildCatalog({ toolsCsv, candidatesCsv, manual }) {
  const toolRows = parseCsv(toolsCsv);
  const candidates = parseCsv(candidatesCsv);
  const manualByKey = new Map(manual.codes.map(code => [`${code.tool.toLowerCase()}|${code.code}`, code]));

  // Un seul code par outil et par code : on garde la vidéo la plus vue.
  const byKey = new Map();
  for (const row of candidates) {
    const key = `${row.outil.toLowerCase()}|${row.code}`;
    const current = byKey.get(key);
    if (!current || Number(row.vues) > Number(current.vues)) byKey.set(key, row);
  }

  const usedIds = new Set();
  const codes = [];
  for (const [key, row] of byKey) {
    const manualCode = manualByKey.get(key);
    const sorted = statusFromProposal(row.proposition || '');
    // Un rejet du tri l'emporte ; sinon on garde le statut saisi à la main.
    const status = sorted === 'rejected' ? 'rejected' : manualCode?.status ?? sorted;
    let id = manualCode?.id ?? `${slugify(row.outil)}-${slugify(row.code)}`;
    if (usedIds.has(id)) id = `${id}-${slugify(row.chaine)}`;
    usedIds.add(id);
    codes.push({
      id,
      tool: row.outil,
      creator: row.chaine,
      code: row.code,
      discount: manualCode?.discount ?? discountFromExcerpt(row.extrait),
      status,
      source: row.url_video,
      sourceTitle: row.titre_video,
      ...(manualCode?.creatorLink || row.lien ? { creatorLink: manualCode?.creatorLink || row.lien } : {}),
      votes: manualCode?.votes ?? 0,
      success: manualCode?.success ?? 0,
      ...(row.raison ? { note: row.raison } : {}),
    });
  }

  // Le site ne montre que les outils qui ont au moins un code public (vérifié ou à tester).
  const isPublic = code => code.status === 'verified' || code.status === 'to_test';
  const withCodes = new Set(codes.filter(isPublic).map(code => code.tool.toLowerCase()));
  const tools = toolRows
    .filter(row => withCodes.has(row.outil.toLowerCase()))
    .map(row => {
      const slug = slugify(row.outil);
      const toolCodes = codes.filter(code => code.tool.toLowerCase() === row.outil.toLowerCase() && isPublic(code));
      return {
        slug,
        name: row.outil,
        category: row.categorie,
        website: `https://${row.site.replace(/^https?:\/\//, '')}`,
        description: manual.descriptions[slug] ?? `Les codes promo donnés par les créateurs pour ${row.outil}.`,
        priority: Number(row.priorite) || 3,
        codes: toolCodes.length,
      };
    })
    .sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name, 'fr'));

  // Toutes les catégories suivies, avec le nombre d'outils publiés (count) et suivis (tracked) dans chacune.
  const categories = [...new Set(toolRows.map(row => row.categorie))].map(name => ({
    slug: slugify(name), name, count: tools.filter(tool => tool.category === name).length,
    tracked: toolRows.filter(row => row.categorie === name).length,
  }));

  return { categories, tools, codes, tracked: toolRows.length };
}

if (isMainScript()) {
  const catalog = buildCatalog({
    toolsCsv: readFileSync('data/outils-v0.csv', 'utf8'),
    candidatesCsv: readFileSync('data/candidats-tous.csv', 'utf8'),
    manual: JSON.parse(readFileSync('data/catalogue-manuel.json', 'utf8')),
  });
  writeFileSync('lib/catalog.json', JSON.stringify(catalog, null, 1) + '\n');
  const count = status => catalog.codes.filter(code => code.status === status).length;
  console.log(`${catalog.tools.length} outils avec codes sur ${catalog.tracked} suivis. Codes : ${count('verified')} vérifiés, ${count('to_test')} à tester, ${count('pending')} en attente, ${count('rejected')} rejetés.`);
}
