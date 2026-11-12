// Anciennes adresses françaises → nouvelles adresses anglaises (redirections permanentes, voir next.config.mjs).
// Fichier .mjs pour être lu à la fois par next.config.mjs et par les tests.
export const legacyRedirects = [
  { source: '/outils/:slug', destination: '/tools/:slug' },
  { source: '/createurs', destination: '/' },
  { source: '/createurs/:slug', destination: '/@:slug' },
  { source: '/recherche', destination: '/search' },
  { source: '/proposer', destination: '/submit' },
  { source: '/trousseau', destination: '/' },
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

// Pages déplacées : la page Explorer est devenue la page principale, ses liens déjà partagés (filtres compris) y mènent.
// Les pages Codes et Créateurs n'existent plus : la page principale montre déjà tous les codes (ses filtres family, q
// et creator gardent leur nom, la requête suit la redirection). Les pages créateur passent à l'adresse /@nom.
// Les images de partage (opengraph-image, twitter-image) ne sont pas redirigées : Next écrit leur adresse avec le dossier
// interne /creators/…, et une redirection à chaque image fait signaler à Google des « pages avec redirection ».
export const movedRedirects = [
  { source: '/explore', destination: '/' },
  { source: '/codes', destination: '/' },
  { source: '/creators', destination: '/' },
  { source: '/creators/:slug', destination: '/@:slug' },
  { source: '/creators/:slug/:rest((?!(?:.*/)?(?:opengraph|twitter)-image).+)', destination: '/@:slug/:rest' },
];

// Les pages créateur, servies à l'adresse /@nom, vivent dans app/(explore)/creators/[slug] (et [season] dans le site) :
// un dossier « @… » est réservé par Next aux routes parallèles. La réécriture ne repasse pas par les redirections.
// Leurs images de partage gardent l'adresse /creators/… que Next leur donne : elle est servie directement, sans détour.
export const creatorRewrites = [
  { source: '/@:slug', destination: '/creators/:slug' },
  { source: '/@:slug/:rest+', destination: '/creators/:slug/:rest+' },
];
