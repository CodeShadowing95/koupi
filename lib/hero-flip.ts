// Rotation des coupons du hero : à chaque tour, un coupon se retourne et affiche un code qui n'était pas à l'écran.

export type FlipState<T> = { slots: T[]; queue: T[] };

/**
 * Choisit le coupon à retourner (jamais deux fois de suite le même) et le code qu'il affichera.
 * Le code retiré repart en fin de file, pour qu'aucun outil ne soit affiché deux fois en même temps.
 * Renvoie null quand il n'y a aucun code en réserve.
 */
export function nextFlip<T>(state: FlipState<T>, lastSlot: number, random: () => number = Math.random): { slot: number; state: FlipState<T> } | null {
  const { slots, queue } = state;
  if (slots.length === 0 || queue.length === 0) return null;
  const choices = slots.map((_, index) => index).filter(index => slots.length === 1 || index !== lastSlot);
  const slot = choices[Math.min(choices.length - 1, Math.floor(random() * choices.length))];
  const [incoming, ...rest] = queue;
  const nextSlots = [...slots];
  const outgoing = nextSlots[slot];
  nextSlots[slot] = incoming;
  return { slot, state: { slots: nextSlots, queue: [...rest, outgoing] } };
}

/**
 * Angle affiché pendant un tour complet (0 → 360°) : le coupon passe deux fois sur la tranche (90° et 270°).
 * On le ramène entre -90° et 90° pour qu'il montre toujours sa face, jamais un texte à l'envers.
 * `swapped` dit si le nouveau code doit déjà être affiché (après la première tranche).
 */
export function flipFace(angle: number): { rotation: number; swapped: boolean } {
  if (angle < 90) return { rotation: angle, swapped: false };
  if (angle < 270) return { rotation: angle - 180, swapped: true };
  return { rotation: angle - 360, swapped: true };
}
