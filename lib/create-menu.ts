// Menu « + Créer » de la barre du haut : tout ce qu'un visiteur peut ajouter à Merkod, au même endroit.
import { routes } from './routes';

export type CreateActionKey = 'submit' | 'creator' | 'report';
export type CreateAction = { key: CreateActionKey; href: string; label: string; hint: string };

/**
 * Les choix du menu. signedIn : un créateur est connecté, son entrée mène alors à son espace.
 * from : la page en cours, emportée par « Signaler une erreur » pour que l'admin sache d'où vient la remarque.
 */
export function createActions({ signedIn, from }: { signedIn: boolean; from: string }): CreateAction[] {
  const report = from && from !== routes.feedback ? `${routes.feedback}?from=${encodeURIComponent(from)}` : routes.feedback;
  return [
    { key: 'submit', href: routes.submit(), label: 'Proposer un code', hint: 'Un code entendu dans une vidéo ou un podcast' },
    signedIn
      ? { key: 'creator', href: routes.creatorSpace, label: 'Mon espace créateur', hint: 'Tes codes et leurs copies' }
      : { key: 'creator', href: routes.forCreators(), label: 'Créer mon espace créateur', hint: 'Tu es créateur : tes codes, tes copies, ta page' },
    { key: 'report', href: report, label: 'Signaler une erreur', hint: 'Un code qui ne marche plus, une info fausse' },
  ];
}

/** Où mène l'icône créateur : son espace s'il est connecté, sinon la page qui explique et ouvre le compte. */
export const creatorIconHref = (signedIn: boolean) => (signedIn ? routes.creatorSpace : routes.forCreators());
