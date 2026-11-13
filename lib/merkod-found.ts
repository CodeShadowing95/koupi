// Codes « Trouvé par Merkod » : un code que l'admin a trouvé lui-même (sur le site de l'outil, dans un formulaire
// d'inscription…), sans créateur à créditer. En base, ces codes appartiennent à une page créateur réservée (slug
// MERKOD_FOUND_SLUG) : le reste du modèle n'a pas à changer. Cette page n'est jamais publique : le catalogue rend
// ces codes avec un slug de créateur vide, et le site affiche « Trouvé par Merkod » à la place du créateur.

/** Slug réservé de la page qui porte les codes trouvés par Merkod. */
export const MERKOD_FOUND_SLUG = 'trouve-par-merkod';
/** Nom de cette page en base (jamais affiché sur le site). */
export const MERKOD_FOUND_NAME = 'Trouvé par Merkod';
/** Ce que le site écrit à la place du créateur. */
export const MERKOD_FOUND_LABEL = 'Trouvé par Merkod';

export function isMerkodFoundSlug(slug: string | null | undefined): boolean {
  return slug === MERKOD_FOUND_SLUG;
}
