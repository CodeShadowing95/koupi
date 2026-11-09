// Recherche qui pardonne : sans accents, sans espaces ni ponctuation, et quelques fautes de frappe selon la longueur
// de ce qu'on tape (« canava » trouve Canva, « notoin » trouve Notion). Tout se passe en mémoire, sans service externe.

/** Texte replié pour comparer : minuscules, sans accents, sans espaces ni ponctuation (« Nord VPN » → « nordvpn »). */
export function foldText(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
}

/** Fautes tolérées : aucune avant 5 lettres (trop de faux amis), une jusqu'à 7, deux au-delà. */
export function allowedTypos(length: number) {
  return length < 5 ? 0 : length < 8 ? 1 : 2;
}

/**
 * Plus petit nombre de fautes (lettre en trop, en moins, changée ou deux lettres inversées) pour retrouver `query`
 * quelque part dans `text`. S'arrête dès que `limit` est dépassé et renvoie alors `limit + 1`.
 */
export function typoDistance(text: string, query: string, limit: number) {
  const m = query.length;
  const n = text.length;
  if (m === 0) return 0;
  // Ligne i : coût pour placer les i premières lettres de la recherche en finissant à la position j du texte.
  // La ligne 0 vaut 0 partout : la correspondance peut commencer n'importe où dans le texte.
  let before = new Array<number>(n + 1).fill(0);
  let previous = new Array<number>(n + 1).fill(0);
  for (let i = 1; i <= m; i++) {
    const current = new Array<number>(n + 1);
    current[0] = i;
    let best = current[0];
    for (let j = 1; j <= n; j++) {
      const same = query[i - 1] === text[j - 1];
      let cost = Math.min(previous[j - 1] + (same ? 0 : 1), previous[j] + 1, current[j - 1] + 1);
      if (i > 1 && j > 1 && query[i - 1] === text[j - 2] && query[i - 2] === text[j - 1]) cost = Math.min(cost, before[j - 2] + 1);
      current[j] = cost;
      if (cost < best) best = cost;
    }
    if (best > limit) return limit + 1;
    before = previous;
    previous = current;
  }
  return Math.min(limit + 1, ...previous);
}

/**
 * Note de 0 à 100 de `text` pour une recherche déjà repliée (`foldText`) : 100 identique, 90 début, 80 contient,
 * puis 50 moins 10 par faute. 0 si rien ne correspond.
 */
export function matchScore(text: string, foldedQuery: string) {
  if (!foldedQuery) return 0;
  const folded = foldText(text);
  if (!folded) return 0;
  if (folded === foldedQuery) return 100;
  if (folded.startsWith(foldedQuery)) return 90;
  if (folded.includes(foldedQuery)) return 80;
  const limit = allowedTypos(foldedQuery.length);
  if (limit === 0) return 0;
  const typos = typoDistance(folded, foldedQuery, limit);
  return typos <= limit ? 50 - 10 * typos : 0;
}

/** Une note de 80 ou plus veut dire que le texte contient vraiment la recherche, sans faute. */
export const EXACT = 80;

/** Test oui/non pour les filtres : `null` si la recherche est vide, sinon une fonction qui dit si un texte y répond. */
export function fuzzyMatcher(query: string): ((text: string) => boolean) | null {
  const folded = foldText(query);
  return folded ? text => matchScore(text, folded) > 0 : null;
}
