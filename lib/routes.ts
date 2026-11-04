// Adresses des pages publiques (en anglais). Le texte affiché, lui, reste en français.
export const routes = {
  home: '/',
  codes: '/codes',
  categories: '/categories',
  category: (slug: string) => `/categories/${slug}`,
  tool: (slug: string) => `/tools/${slug}`,
  creator: (slug: string) => `/creators/${slug}`,
  creators: (filter: { platform?: string; theme?: string } = {}) => {
    const query = new URLSearchParams(Object.entries(filter).filter((entry): entry is [string, string] => Boolean(entry[1]))).toString();
    return query ? `/creators?${query}` : '/creators';
  },
  search: (query: string) => `/search?q=${encodeURIComponent(query)}`,
  submit: (toolSlug?: string) => (toolSlug ? `/submit?tool=${encodeURIComponent(toolSlug)}` : '/submit'),
  /** Page d'accueil des créateurs, avec les chiffres de sa page quand il arrive depuis « C'est ta page ? ». */
  forCreators: (slug?: string) => (slug ? `/for-creators?c=${encodeURIComponent(slug)}` : '/for-creators'),
  /** Espace du créateur connecté. */
  creatorSpace: '/creator',
  /** Page « Ton avis » : remarques, idées et problèmes des visiteurs. */
  feedback: '/feedback',
  transparency: '/transparency',
  legal: '/legal',
  privacy: '/privacy',
} as const;
