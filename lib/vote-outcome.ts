// Issue d'un vote « Ça a marché ? » d'après la réponse de l'API. Le pouce s'allume dès le clic (vote optimiste) :
// cette réponse dit seulement s'il reste allumé et quel message afficher.

export const VOTE_THANKS = 'Merci, c’est noté. Ton vote aide les suivants.';
export const VOTE_FAILED = 'Le vote n’a pas pu être envoyé.';

export type VoteOutcome = { kept: boolean; message: string };

/** status null : la requête n'a pas abouti (réseau coupé, délai dépassé). */
export function voteOutcome(status: number | null, error?: string): VoteOutcome {
  if (status !== null && status >= 200 && status < 300) return { kept: true, message: VOTE_THANKS };
  // Déjà voté pour ce code depuis cette connexion : le vote compte déjà, le pouce reste allumé.
  if (status === 409) return { kept: true, message: error || 'Déjà noté, merci !' };
  return { kept: false, message: error || VOTE_FAILED };
}
