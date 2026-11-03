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
  keyring: '/keyring',
  transparency: '/transparency',
  legal: '/legal',
  privacy: '/privacy',
} as const;
