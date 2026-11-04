import { permanentRedirect } from 'next/navigation';
import { routes } from '@/lib/routes';

// La liste des catégories a laissé la place aux pastilles en haut de la page Codes.
// Les pages de chaque catégorie restent, pour les visiteurs qui arrivent de Google.
export default function Categories() {
  permanentRedirect(routes.codes);
}
