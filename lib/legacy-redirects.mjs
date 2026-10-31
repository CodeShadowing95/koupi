// Anciennes adresses françaises → nouvelles adresses anglaises (redirections permanentes, voir next.config.mjs).
// Fichier .mjs pour être lu à la fois par next.config.mjs et par les tests.
export const legacyRedirects = [
  { source: '/outils/:slug', destination: '/tools/:slug' },
  { source: '/createurs/:slug', destination: '/creators/:slug' },
  { source: '/recherche', destination: '/search' },
  { source: '/proposer', destination: '/submit' },
  { source: '/trousseau', destination: '/keyring' },
  { source: '/transparence', destination: '/transparency' },
  { source: '/mentions-legales', destination: '/legal' },
  { source: '/confidentialite', destination: '/privacy' },
];
