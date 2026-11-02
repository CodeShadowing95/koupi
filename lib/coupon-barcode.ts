// Code-barres décoratif du bon de proposition : il change à chaque lettre du code tapé.
// Ce n'est pas un vrai code-barres lisible, juste un dessin stable (même code → mêmes barres).

/** Empreinte numérique simple et stable d'un texte (FNV-1a 32 bits). */
export function hashText(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/** Numéro du bon, sur 6 chiffres, tiré du code (000000 tant que le code est vide). */
export function couponNumber(code: string): string {
  const clean = code.trim().toUpperCase();
  return clean ? String(hashText(clean) % 1_000_000).padStart(6, '0') : '000000';
}

export type Bar = { x: number; width: number };

/**
 * Barres du code-barres : des barres de garde au début et à la fin, et trois barres par caractère
 * dont la largeur (1 à 3) vient des bits du caractère. Renvoie aussi la largeur totale.
 */
export function barcodeBars(code: string): { bars: Bar[]; width: number } {
  const clean = code.trim().toUpperCase().slice(0, 24) || 'KOUPI';
  const widths: number[] = [1, 1, 1];
  for (const char of clean) {
    const bits = hashText(char + clean.length);
    for (let i = 0; i < 3; i++) widths.push(1 + ((bits >> (i * 2)) & 3) % 3);
  }
  widths.push(1, 1, 1);
  const bars: Bar[] = [];
  let x = 0;
  widths.forEach((width, i) => {
    const gap = 1 + (i % 2);
    bars.push({ x, width });
    x += width + gap;
  });
  return { bars, width: x };
}
