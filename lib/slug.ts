/** Même règle que scripts/build-catalog.mjs : minuscules, sans accents, mots séparés par des tirets. */
export function slugify(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
