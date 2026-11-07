// Fiche d'un outil (/tools/[slug]) : la page du code choisi, sans barre du haut ni fil d'Ariane,
// avec un seul bouton « Retour ». Fonctions pures, appelées côté client.

/** La page affiche-t-elle un code choisi (fiche outil) ? Ces pages n'ont pas la barre du haut. */
export function isCodePage(pathname: string): boolean {
  return /^\/tools\/[^/]+\/?$/.test(pathname);
}

/**
 * Où mène « Retour » : la page d'avant si on vient de Merkod (on garde sa recherche et ses filtres),
 * sinon la page principale (arrivée depuis Google, un lien partagé ou un nouvel onglet).
 */
export function backTarget(referrer: string, origin: string, historyLength: number): 'history' | '/' {
  if (historyLength < 2 || !referrer) return '/';
  try {
    return new URL(referrer).origin === origin ? 'history' : '/';
  } catch {
    return '/';
  }
}
