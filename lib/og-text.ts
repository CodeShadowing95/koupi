// Mise en page du texte des images d'aperçu (components/og-coupon.tsx) : l'image a une taille fixe.

/** Raccourcit un texte trop long pour tenir sur l'image, sans couper un mot en deux si possible. */
export function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

/** Taille du titre selon sa longueur, pour qu'il tienne sur deux lignes au plus. */
export function titleSize(title: string): number {
  if (title.length <= 14) return 96;
  if (title.length <= 24) return 76;
  return 60;
}

export type OgText = { eyebrow: string; title: string; highlight?: string; detail?: string; stub: string };

/** Texte du coupon d'aperçu d'une fiche outil : la meilleure réduction et qui l'a donnée. Le code lui-même reste sur le site. */
export function toolOgText(tool: string, codes: { creator: string; discount: string }[]): OgText {
  const [best] = codes;
  if (!best) return { eyebrow: 'Code promo', title: tool, detail: 'Pas encore de code vérifié', stub: 'Propose un code' };
  return {
    eyebrow: 'Code promo',
    title: tool,
    highlight: best.discount,
    detail: codes.length > 1 ? `${codes.length} codes de créateurs, dont celui de ${best.creator}` : `Donné par ${best.creator}`,
    stub: 'Copie le code',
  };
}

/** Texte du coupon d'aperçu d'une page créateur. Le nom reste tel que la plateforme le donne (jamais remis en forme). */
export function creatorOgText(creator: string, codes: { tool: string }[]): OgText {
  const tools = [...new Set(codes.map(code => code.tool))];
  return {
    eyebrow: 'Créateur',
    title: creator,
    highlight: codes.length ? `${codes.length} ${codes.length > 1 ? 'codes promo' : 'code promo'}` : undefined,
    detail: tools.length ? tools.slice(0, 3).join(', ') + (tools.length > 3 ? '…' : '') : undefined,
    stub: 'Ses codes, vérifiés',
  };
}

export const HOME_OG_TEXT: OgText = {
  eyebrow: 'Codes promo de créateurs',
  title: 'Les codes promo des créateurs',
  highlight: 'Relié à sa source',
  detail: 'YouTube, podcasts, Instagram…',
  stub: 'Trouve ton code',
};
