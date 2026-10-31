// Mécanique de déchirure du talon, reprise du composant « Interactive Boarding Pass Ticket Card »
// (kedhareswer sur 21st.dev) : le talon suit le doigt, se raidit comme du papier, puis cède.

/** Un geste au-delà d'un cinquième du talon, ou un coup sec, le détache. */
export const tearDecision = (distance: number, velocity: number, size: number): boolean =>
  distance > size * 0.2 || (velocity > 0.5 && distance > size * 0.05);

/** Le talon suit librement au début, puis résiste comme du papier. */
export const resist = (distance: number, size: number): number => {
  const d = Math.max(0, Number.isFinite(distance) ? distance : 0);
  const limit = Math.max(1, size) * 0.12;
  return d < limit ? d : limit + (d - limit) * 0.22;
};
