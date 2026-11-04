// Fenêtre « Laisse un 👍 » de la page des codes : quand l'ouvrir, une seule fois par navigateur.
// Par défaut (trigger 'copy'), elle attend que le visiteur copie un code, parte l'essayer sur le site
// de l'outil puis revienne sur Merkod : c'est là qu'il sait si le code a marché. Si l'onglet ne perd
// jamais la main (pas de lien à ouvrir), elle s'ouvre après un court délai.
// Avec trigger 'arrival', elle s'ouvre peu après la première visite de la page.

export const VOTE_INVITE_KEY = 'koupi-vote-invite';
/** Événement envoyé par un coupon quand son code est copié pour la première fois. */
export const CODE_COPIED_EVENT = 'koupi:code-copied';
/** Événement envoyé après un vote, pour que tous les boutons du même code se mettent à jour. */
export const CODE_VOTED_EVENT = 'koupi:code-voted';

export type InviteTrigger = 'copy' | 'arrival';
/** idle : rien à faire ; waiting : code copié, on attend le retour ; away : le visiteur est sur un autre onglet ;
 *  open : la fenêtre est affichée ; done : déjà vue, seul le bouton en bas à droite reste. */
export type InvitePhase = 'idle' | 'waiting' | 'away' | 'open' | 'done';
export type InviteEvent = 'copy' | 'hidden' | 'visible' | 'timeout' | 'arrive' | 'close' | 'reopen';

/** Délai avant ouverture : au retour sur l'onglet, sans départ, et à l'arrivée. */
export const INVITE_DELAYS = { back: 700, stayed: 6000, arrival: 1500 } as const;

export function initialPhase(seen: boolean): InvitePhase {
  return seen ? 'done' : 'idle';
}

/** Étape suivante de la fenêtre. Une fois vue (done), seul le bouton la rouvre. */
export function nextPhase(phase: InvitePhase, event: InviteEvent, trigger: InviteTrigger): InvitePhase {
  if (event === 'close') return phase === 'open' ? 'done' : phase;
  if (event === 'reopen') return phase === 'done' ? 'open' : phase;
  switch (phase) {
    case 'idle':
      if (trigger === 'copy' && event === 'copy') return 'waiting';
      if (trigger === 'arrival' && event === 'arrive') return 'open';
      return phase;
    case 'waiting':
      if (event === 'hidden') return 'away';
      if (event === 'timeout') return 'open';
      return phase;
    case 'away':
      return event === 'visible' ? 'open' : phase;
    default:
      return phase;
  }
}

export function readInviteSeen(storage: Pick<Storage, 'getItem'> | undefined): boolean {
  try { return storage?.getItem(VOTE_INVITE_KEY) === 'seen'; } catch { return false; }
}

export function markInviteSeen(storage: Pick<Storage, 'setItem'> | undefined): void {
  try { storage?.setItem(VOTE_INVITE_KEY, 'seen'); } catch { /* stockage indisponible : elle se rouvrira à la prochaine visite */ }
}

export type CopiedCode = { id: string; code: string; tool: string; creator: string };
