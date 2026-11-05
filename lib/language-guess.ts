// Langue d'un texte court (titre, description d'une chaîne ou d'un podcast), devinée par ses petits mots les plus
// courants. Sans dépendance ni réseau. Sert quand la source ne donne pas la langue ; l'admin peut corriger.

const STOPWORDS: Record<string, string[]> = {
  fr: ['le', 'la', 'les', 'des', 'une', 'est', 'et', 'du', 'pour', 'dans', 'que', 'qui', 'pas', 'sur', 'avec', 'nous', 'vous', 'mon', 'mes', 'cette', 'chaque', 'aux', 'sont', 'ce', 'plus', 'tout', 'comment', 'leur'],
  en: ['the', 'and', 'is', 'of', 'to', 'in', 'for', 'with', 'you', 'your', 'this', 'that', 'are', 'on', 'how', 'what', 'my', 'we', 'about', 'from', 'every', 'our', 'be', 'it'],
  es: ['el', 'los', 'las', 'del', 'y', 'es', 'con', 'para', 'una', 'por', 'que', 'como', 'más', 'sobre', 'tu', 'nuestro', 'cada'],
  de: ['der', 'die', 'das', 'und', 'ist', 'mit', 'für', 'ein', 'eine', 'nicht', 'auf', 'wie', 'ich', 'wir', 'dein', 'über', 'jede'],
  it: ['il', 'gli', 'della', 'che', 'è', 'per', 'con', 'una', 'sono', 'come', 'nel', 'più', 'questo', 'ogni'],
  pt: ['o', 'os', 'as', 'do', 'da', 'dos', 'e', 'é', 'com', 'para', 'uma', 'não', 'como', 'mais', 'seu', 'cada', 'sobre'],
};

/** Code ISO 639-1 (fr, en…) ou null si le texte est trop court ou trop ambigu. */
export function guessLanguage(text: string): string | null {
  const words = text.toLowerCase().normalize('NFC').match(/[\p{L}']+/gu) ?? [];
  if (words.length < 6) return null;
  const scores = Object.entries(STOPWORDS).map(([language, list]) => {
    const set = new Set(list);
    return [language, words.filter(word => set.has(word.replace(/^[ldjmnst]'/, ''))).length] as const;
  }).sort((a, b) => b[1] - a[1]);
  const [best, second] = scores;
  if (best[1] < 3 || best[1] < second[1] * 1.5) return null;
  return best[0];
}

/** « fr-FR », « en_us », « FR » → « fr » ; null si ce n'est pas une langue. */
export function normalizeLanguage(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const code = value.trim().toLowerCase().split(/[-_]/)[0];
  return /^[a-z]{2}$/.test(code) ? code : null;
}

/** « fr » → « FR », null si ce n'est pas un code pays à deux lettres. */
export function normalizeCountry(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const code = value.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : null;
}

const languageNames = new Intl.DisplayNames(['fr'], { type: 'language' });
const regionNames = new Intl.DisplayNames(['fr'], { type: 'region' });

/** « fr » → « Français » */
export function languageName(code: string): string {
  try { const name = languageNames.of(code) ?? code; return name.charAt(0).toUpperCase() + name.slice(1); } catch { return code; }
}

/** « FR » → « France » */
export function countryName(code: string): string {
  try { return regionNames.of(code) ?? code; } catch { return code; }
}

/** « FR » → 🇫🇷 */
export function countryFlag(code: string): string {
  return /^[A-Z]{2}$/.test(code) ? String.fromCodePoint(...[...code].map(letter => 0x1f1e6 + letter.charCodeAt(0) - 65)) : '';
}
