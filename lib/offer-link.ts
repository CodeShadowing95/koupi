// Offre donnée par un lien d'affiliation (« https://try.krispcall.com/tad ») plutôt que par un code à taper (ADR-0040).
// En base, le code est vide (null) et le lien du créateur est obligatoire. Dans l'application, le code vide vaut ''.

/** Vrai si l'offre se prend par son lien : il n'y a pas de code à copier. */
export function isLinkOffer(code: { code: string | null }): boolean {
  return !code.code?.trim();
}

/** Ce qui nomme l'offre dans l'admin, le journal et les notes : le code, sinon « lien ». */
export function offerName(code: string | null, link?: string | null): string {
  if (code?.trim()) return code.trim();
  return link ? `lien ${shortLink(link)}` : 'lien';
}

/** Un lien sans « https:// » ni « www. » ni « / » final, en minuscules, pour le comparer et l'afficher. */
export function shortLink(link: string): string {
  return link.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/[/?#]+$/, '');
}

/** Cherche le lien de l'offre dans le texte de la source (avec ou sans https://), et renvoie l'extrait qui sert de preuve. */
export function findLinkInText(link: string, text: string): { found: boolean; excerpt: string | null } {
  const needle = shortLink(link);
  if (!needle || !text) return { found: false, excerpt: null };
  const lower = text.toLowerCase();
  let index = lower.indexOf(needle);
  while (index >= 0) {
    // Le lien doit s'arrêter là : « krispcall.com/tad » ne compte pas dans « krispcall.com/tadpole ».
    const after = lower.charAt(index + needle.length);
    if (!/[\p{L}\p{N}_-]/u.test(after)) {
      const start = Math.max(0, index - 80);
      const end = Math.min(text.length, index + needle.length + 80);
      return { found: true, excerpt: `${start > 0 ? '…' : ''}${text.slice(start, end).replace(/\s+/g, ' ').trim()}${end < text.length ? '…' : ''}` };
    }
    index = lower.indexOf(needle, index + 1);
  }
  return { found: false, excerpt: null };
}
