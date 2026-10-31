// Adresses des pages publiques (en anglais). Le texte affiché, lui, reste en français.
export const routes = {
  home: '/',
  categories: '/categories',
  category: (slug: string) => `/categories/${slug}`,
  tool: (slug: string) => `/tools/${slug}`,
  creator: (slug: string) => `/creators/${slug}`,
  search: (query: string) => `/search?q=${encodeURIComponent(query)}`,
  submit: (toolSlug?: string) => (toolSlug ? `/submit?tool=${encodeURIComponent(toolSlug)}` : '/submit'),
  keyring: '/keyring',
  transparency: '/transparency',
  legal: '/legal',
  privacy: '/privacy',
} as const;
