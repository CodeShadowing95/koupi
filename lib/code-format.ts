// Format d'un code promo du catalogue : lettres, chiffres et tirets, sans espace, 40 caractères au plus, en majuscules.
// Le serveur range toujours le code en majuscules : « digitiz » et « DIGITIZ » sont le même code.

export const MAX_CODE_LENGTH = 40;
const CODE_PATTERN = /^[A-Z0-9](?:[A-Z0-9-]*[A-Z0-9])?$/;

export const CODE_FORMAT_ERROR = `Le code ne peut contenir que des lettres, des chiffres et des tirets, sans espace (${MAX_CODE_LENGTH} caractères au plus).`;

/** Le code tel qu'il est rangé : sans espace autour, en majuscules. */
export function normalizeCode(raw: string): string {
  return raw.trim().toLocaleUpperCase('fr-FR');
}

/** Le message d'erreur si le code (déjà normalisé) n'a pas le bon format, null s'il est bon. */
export function codeFormatError(code: string): string | null {
  if (!code) return 'Indique le code.';
  if (code.length > MAX_CODE_LENGTH || !CODE_PATTERN.test(code)) return CODE_FORMAT_ERROR;
  return null;
}

/** Deux codes identiques, casse et espaces autour ignorés. */
export function sameCode(a: string, b: string): boolean {
  return normalizeCode(a) === normalizeCode(b);
}

export type ExistingCode = { id: string; toolSlug: string; code: string; archived?: boolean };

/** Le code du catalogue qui a déjà ce code pour cet outil (en dehors de celui qu'on modifie), s'il y en a un. */
export function findDuplicateCode<T extends ExistingCode>(codes: readonly T[], toolSlug: string, code: string, exceptId?: string): T | undefined {
  if (!toolSlug || !code.trim()) return undefined;
  return codes.find(item => item.id !== exceptId && item.toolSlug === toolSlug && sameCode(item.code, code));
}
