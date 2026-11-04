// Anciennes adresses françaises → nouvelles adresses anglaises (redirections permanentes, voir next.config.mjs).
// Fichier .mjs pour être lu à la fois par next.config.mjs et par les tests.
export const legacyRedirects = [
  { source: '/outils/:slug', destination: '/tools/:slug' },
  { source: '/createurs', destination: '/creators' },
  { source: '/createurs/:slug', destination: '/creators/:slug' },
  { source: '/recherche', destination: '/search' },
  { source: '/proposer', destination: '/submit' },
  { source: '/trousseau', destination: '/creators' },
  { source: '/transparence', destination: '/transparency' },
  { source: '/mentions-legales', destination: '/legal' },
  { source: '/confidentialite', destination: '/privacy' },
];

// Les 10 catégories d'origine éclatées en catégories plus fines (ADR-0026) → la plus proche de l'ancienne.
// Hébergement web et Noms de domaine gardent leur adresse.
export const categoryRedirects = [
  ['vpn-et-securite', 'vpn'],
  ['ia', 'assistants-conversationnels'],
  ['productivite', 'gestion-de-projet'],
  ['formation', 'cours-en-ligne'],
  ['e-commerce-et-site', 'createurs-de-sites'],
  ['creation-et-design', 'design-graphique'],
  ['outils-createurs', 'croissance-youtube'],
  ['marketing-et-e-mail', 'e-mailing-et-newsletters'],
  ['finance-et-freelance', 'comptabilite-et-facturation'],
  ['developpement', 'serveurs-et-cloud'],
].map(([from, to]) => ({ source: `/categories/${from}`, destination: `/categories/${to}` }));
