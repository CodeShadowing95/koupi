// La catégorie du catalogue qui correspond au texte d'un visiteur (« productivité », « Productivité »…),
// pour préremplir le formulaire de l'admin. Accents, casse et ponctuation ignorés.
import { slugify } from './slug';

export function matchCategory<T extends { slug: string; name: string }>(categories: readonly T[], raw: string | null | undefined): T | undefined {
  const key = slugify(raw ?? '');
  if (!key) return undefined;
  return categories.find(category => category.slug === key || slugify(category.name) === key);
}
