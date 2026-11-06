// Données structurées schema.org (JSON-LD) lues par Google : fil d'Ariane, site, profil d'un créateur.
// Seulement des faits déjà visibles sur la page.

type Crumb = { label: string; href?: string };
type Json = Record<string, unknown>;

const absolute = (base: string, path: string) => (/^https?:\/\//.test(path) ? path : `${base}${path === '/' ? '' : path}`);

/** Fil d'Ariane : Accueil d'abord, la page en cours en dernier (sans adresse, comme Google l'accepte). */
export function breadcrumbLd(items: Crumb[], base: string): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      ...(item.href ? { item: absolute(base, item.href) } : {}),
    })),
  };
}

/** Le site et son éditeur, sur l'accueil. */
export function siteLd(base: string): Json[] {
  return [
    { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Merkod', url: base, inLanguage: 'fr-FR' },
    { '@context': 'https://schema.org', '@type': 'Organization', name: 'Merkod', url: base, logo: `${base}/merkod-icone-512.png` },
  ];
}

/** Page d'un créateur : la personne, ses comptes publics (sameAs) et sa photo si Merkod l'a. */
export function creatorProfileLd(input: { name: string; path: string; bio?: string | null; accounts: string[]; image?: string }, base: string): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    url: absolute(base, input.path),
    mainEntity: {
      '@type': 'Person',
      name: input.name,
      url: absolute(base, input.path),
      ...(input.bio ? { description: input.bio } : {}),
      ...(input.image ? { image: absolute(base, input.image) } : {}),
      ...(input.accounts.length ? { sameAs: input.accounts } : {}),
    },
  };
}

/** Texte à poser dans <script type="application/ld+json"> : « < » échappé pour qu'aucun nom ne ferme la balise. */
export function jsonLdText(data: Json | Json[]): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
