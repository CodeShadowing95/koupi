/** Initiales d'un nom (2 lettres) pour l'avatar des créateurs : « Tutorial Stack » → « TS ». */
export function initials(name: string) {
  const words = name.replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);
  return ((words[0]?.[0] ?? '') + (words[1]?.[0] ?? words[0]?.[1] ?? '')).toUpperCase() || '?';
}
