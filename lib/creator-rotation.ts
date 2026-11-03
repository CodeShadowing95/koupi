// Ordre des chaînes affichées par le lien tournant de l'accueil.

/** Copie mélangée (Fisher-Yates). `random` est injectable pour les tests. */
export function shuffled<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Position suivante, en revenant au début après le dernier nom. */
export function nextRotation(current: number, length: number): number {
  return length > 0 ? (current + 1) % length : 0;
}

/** Chaînes distinctes ayant au moins un code public, la mieux notée en premier. */
export function rotationCreators(codes: readonly { creator: string; creatorSlug: string }[], first?: string): { name: string; slug: string }[] {
  const seen = new Map<string, { name: string; slug: string }>();
  for (const code of codes) if (!seen.has(code.creatorSlug)) seen.set(code.creatorSlug, { name: code.creator, slug: code.creatorSlug });
  const list = [...seen.values()];
  const head = list.findIndex(creator => creator.slug === first);
  if (head > 0) list.unshift(...list.splice(head, 1));
  return list;
}
