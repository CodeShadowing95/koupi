// Orbite « Ils ont donné le code » (page Présentation) : toutes les 30 secondes, les avatars s'effacent
// et un autre tirage de créateurs apparaît. Fonctions pures, appelées côté client.

/** Nombre de places sur l'orbite. */
export const ORBIT_SLOTS = 12;
/** Délai entre deux tirages, en millisecondes. */
export const ORBIT_SHUFFLE_MS = 30_000;

/**
 * Un nouveau tirage de `count` éléments pris au hasard dans `pool`.
 * Quand le vivier est plus grand que l'orbite, on préfère ceux qui n'étaient pas affichés,
 * pour que le changement se voie ; sinon, les mêmes reviennent dans un autre ordre.
 */
export function drawOrbit<T>(pool: T[], count: number, current: T[] = [], random: () => number = Math.random): T[] {
  const shuffle = (list: T[]) => {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };
  const shown = new Set(current);
  const fresh = shuffle(pool.filter(item => !shown.has(item)));
  const again = shuffle(pool.filter(item => shown.has(item)));
  return shuffle([...fresh, ...again].slice(0, Math.min(count, pool.length)));
}

/** Exemples de la liste à gauche de l'orbite : des créateurs inventés, pour ne jamais présenter un vrai code comme valable. */
export const ORBIT_EXAMPLES = [
  { name: 'Camille Code', what: 'Hébergement web', discount: '−30 %' },
  { name: 'Studio Nomade', what: 'VPN', discount: '3 mois offerts' },
  { name: 'Le Podcast Malin', what: 'Banque en ligne', discount: '80 € offerts' },
  { name: 'Tom Monte', what: 'Montage vidéo', discount: '−15 %' },
];
