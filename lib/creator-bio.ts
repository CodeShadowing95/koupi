// Présentation d'un créateur (en haut de sa page publique). Sans base : importable par les composants client.

type Parsed<T> = { ok: true; data: T } | { ok: false; error: string };

export const CREATOR_BIO_MAX = 400;

/** Présentation du créateur : espaces en trop retirés, vide → null. Trop longue → erreur (on ne coupe pas en silence). */
export function parseCreatorBio(raw: unknown): Parsed<string | null> {
  if (raw === undefined || raw === null) return { ok: true, data: null };
  if (typeof raw !== 'string') return { ok: false, error: 'Présentation invalide.' };
  const bio = raw.replace(/\r\n?/g, '\n').split('\n').map(line => line.replace(/[ \t]+/g, ' ').trim()).join('\n').replace(/\n{3,}/g, '\n\n').trim();
  if (!bio) return { ok: true, data: null };
  if (bio.length > CREATOR_BIO_MAX) return { ok: false, error: `La présentation dépasse ${CREATOR_BIO_MAX} caractères.` };
  return { ok: true, data: bio };
}
