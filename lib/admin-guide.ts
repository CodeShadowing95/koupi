// Sommaire du guide de l'admin : les chapitres, leur ordre et la progression de lecture.
// Le contenu de chaque chapitre est dans app/admin/guide/chapters.tsx.

export type GuidePart = { id: string; title: string; description: string };
export type GuideChapter = {
  slug: string;
  part: GuidePart['id'];
  title: string;
  /** Une phrase : ce que le chapitre apporte. */
  summary: string;
  /** Temps de lecture en minutes. */
  minutes: number;
  /** Ce que le lecteur saura faire à la fin. */
  goals: string[];
  /** Page de l'admin où mettre en pratique. */
  practice?: { href: string; label: string };
};

export const guideParts: GuidePart[] = [
  { id: 'start', title: 'Bien démarrer', description: 'Le rôle de l’admin et comment se repérer.' },
  { id: 'moderate', title: 'Modérer', description: 'Décider ce qui entre dans le catalogue public.' },
  { id: 'catalog', title: 'Le catalogue', description: 'Ranger les outils, les créateurs et les catégories.' },
  { id: 'steer', title: 'Piloter', description: 'Lire les chiffres et tenir une routine.' },
  { id: 'admin', title: 'Administrer', description: 'Ce que les visiteurs peuvent voir du site.' },
];

export const guideChapters: GuideChapter[] = [
  {
    slug: 'introduction', part: 'start', title: 'Bienvenue dans l’admin', minutes: 3,
    summary: 'Ce qu’est Merkod, ce que fait un admin et la promesse à tenir.',
    goals: ['Expliquer Merkod en une phrase', 'Savoir ce que l’admin décide et ce qu’il ne décide pas', 'Connaître la règle d’or : la source avant tout'],
    practice: { href: '/admin', label: 'Ouvrir l’accueil' },
  },
  {
    slug: 'se-reperer', part: 'start', title: 'Se repérer dans l’admin', minutes: 6,
    summary: 'Le menu, la recherche ⌘K, la cloche de notifications, les vues Cartes et Tableau, le panneau de détail et l’export.',
    goals: ['Trouver n’importe quoi en deux secondes', 'Savoir ce qui t’attend grâce à la cloche', 'Filtrer, trier et changer de vue', 'Ouvrir le détail d’un élément sans quitter la liste', 'Exporter une liste en Excel ou en CSV'],
    practice: { href: '/admin/codes', label: 'Essayer sur la liste des codes' },
  },
  {
    slug: 'vie-d-un-code', part: 'start', title: 'La vie d’un code', minutes: 3,
    summary: 'Les quatre statuts d’un code et ce qui est visible sur le site.',
    goals: ['Connaître les statuts En attente, À tester, Vérifié et Rejeté', 'Savoir ce que voit un visiteur', 'Savoir quand rejeter'],
  },
  {
    slug: 'propositions', part: 'moderate', title: 'Traiter les propositions', minutes: 5,
    summary: 'Les codes envoyés par les visiteurs : valider, marquer en doublon ou refuser.',
    goals: ['Vérifier une proposition en moins d’une minute', 'Choisir entre Valider, Doublon et Refuser', 'Répondre vite pour garder la confiance des visiteurs', 'Lire et ranger les retours des visiteurs'],
    practice: { href: '/admin/propositions', label: 'Ouvrir les propositions' },
  },
  {
    slug: 'codes', part: 'moderate', title: 'Tester et tenir les codes', minutes: 5,
    summary: 'Tester un code, le marquer « Marche » ou « Ne marche pas », le modifier et le retester.',
    goals: ['Tester un code sans se tromper', 'Ajouter un code à la main', 'Enregistrer une offre donnée par un lien, sans code', 'Garder les codes vérifiés à jour tous les 30 jours', 'Voir les codes les plus copiés et ceux qui expirent', 'Savoir d’où vient chaque code'],
    practice: { href: '/admin/codes?status=to_test', label: 'Voir les codes à tester' },
  },
  {
    slug: 'verifications', part: 'moderate', title: 'Vérifier avec l’aide de l’IA', minutes: 7,
    summary: 'La page Vérifications : le score, ses raisons, l’extrait de la source, tes trois décisions et les retests de nuit.',
    goals: ['Lire un score et ses raisons', 'Choisir entre Valider, Testé au paiement et Rejeter', 'Corriger un code mal repéré', 'Savoir quand l’IA relève un lien d’offre', 'Traiter la file au clavier', 'Traiter les retests de nuit', 'Savoir ce que fait l’IA, ce qu’elle coûte et ce qu’elle ne décide jamais'],
    practice: { href: '/admin/verifications', label: 'Ouvrir les vérifications' },
  },
  {
    slug: 'podcasts', part: 'moderate', title: 'Suivre des podcasts', minutes: 7,
    summary: 'Choisir les podcasts que Merkod lit pour trouver des codes, lancer une lecture, les mettre en pause ou les retirer.',
    goals: ['Trouver et suivre un podcast, ou en découvrir dans les classements', 'Suivre ou écarter les podcasts candidats trouvés chaque lundi', 'Savoir comment Merkod repère un code dans un épisode, avec ou sans IA', 'Savoir à quel créateur ses codes sont crédités', 'Mettre en pause sans rien perdre', 'Voir ce que Merkod a lu dans chaque épisode', 'Repérer les podcasts qui rapportent et mettre en pause ceux qui ne donnent plus rien', 'Ajouter en un clic l’outil d’un code trouvé hors catalogue', 'Faire analyser un site par l’IA et créer une catégorie'],
    practice: { href: '/admin/podcasts', label: 'Ouvrir les podcasts suivis' },
  },
  {
    slug: 'outils', part: 'catalog', title: 'Gérer les outils', minutes: 4,
    summary: 'Ajouter un outil, régler sa priorité, l’archiver ou le restaurer.',
    goals: ['Ajouter un outil propre', 'Récupérer et actualiser les logos', 'Chercher des codes pour un outil', 'Utiliser la priorité pour choisir quoi couvrir', 'Archiver sans rien perdre'],
    practice: { href: '/admin/outils', label: 'Ouvrir les outils' },
  },
  {
    slug: 'createurs', part: 'catalog', title: 'Suivre les créateurs', minutes: 14,
    summary: 'Qui donne les codes, leur profil, leurs comptes, leur niveau de confiance, leurs demandes et comment garder des noms propres.',
    goals: ['Trier et filtrer les créateurs', 'Trouver qui contacter', 'Lire la fiche d’un créateur', 'Écrire sa présentation', 'Relier et contrôler ses comptes', 'Suivre les vidéos de ses chaînes', 'Comprendre les trois niveaux', 'Faire prouver un compte par la bio', 'Répondre aux revendications et signalements', 'Donner l’accès à l’espace créateur', 'Éviter les doublons de noms'],
    practice: { href: '/admin/createurs', label: 'Ouvrir les créateurs' },
  },
  {
    slug: 'categories', part: 'catalog', title: 'Organiser les catégories', minutes: 6,
    summary: 'Les rayons du site : familles, création, renommage, catégories vides et recherche de codes.',
    goals: ['Comprendre la couverture d’une catégorie', 'Ranger une catégorie dans sa famille', 'Créer ou renommer une catégorie', 'Trouver les rayons vides à remplir', 'Chercher des codes sur YouTube pour une catégorie', 'Faire ramener du neuf à chaque recherche'],
    practice: { href: '/admin/categories', label: 'Ouvrir les catégories' },
  },
  {
    slug: 'sources', part: 'catalog', title: 'Sources de codes', minutes: 5,
    summary: 'Les endroits où Merkod trouve des codes : ce que chacun rapporte, ce qu’il coûte, quand il passe et le journal des passages.',
    goals: ['Lire le rendement d’une source', 'Savoir quand passe chaque source et ce qu’elle coûte', 'Lancer une source à la main en connaissant le coût', 'Repérer un passage raté dans le journal'],
    practice: { href: '/admin/sources', label: 'Ouvrir les sources' },
  },
  {
    slug: 'indicateurs', part: 'steer', title: 'Lire les indicateurs', minutes: 8,
    summary: 'Couverture, codes vérifiés, réussite, délai : ce qu’ils disent et quoi faire.',
    goals: ['Lire les quatre indicateurs clés', 'Savoir quel geste fait monter chaque chiffre', 'Réagir aux alertes urgentes de l’accueil', 'Utiliser la liste « À faire »', 'Lire le rendement de chaque source et ce que les visiteurs copient', 'Ajouter un outil depuis une recherche sans résultat', 'Surveiller le quota YouTube et la dépense IA', 'Lire la vitesse ressentie par les visiteurs'],
    practice: { href: '/admin/stats', label: 'Ouvrir les statistiques' },
  },
  {
    slug: 'routine', part: 'steer', title: 'La routine et les mots du métier', minutes: 3,
    summary: 'Dix minutes par jour, trente par semaine, une heure par mois. Et le lexique.',
    goals: ['Avoir une routine simple', 'Parler le langage du métier'],
    practice: { href: '/admin', label: 'Commencer la routine du jour' },
  },
  {
    slug: 'administration', part: 'admin', title: 'Administrer le site', minutes: 6,
    summary: 'Mettre le site en pause, couper ou rallumer une page publique, gérer les comptes créateurs, relire le journal.',
    goals: ['Mettre tout le site en pause et le rouvrir', 'Couper une page et savoir ce qui disparaît avec elle', 'Savoir quelles pages restent toujours en ligne', 'Désactiver, retirer l’accès ou supprimer un compte créateur', 'Relire le journal de tes gestes'],
    practice: { href: '/admin/administration', label: 'Ouvrir l’administration' },
  },
];

export const GUIDE_STORAGE_KEY = 'koupi-admin-guide-read';

export function findChapter(slug: string) {
  return guideChapters.find(chapter => chapter.slug === slug) ?? null;
}

/** Numéro du chapitre, à partir de 1. */
export function chapterNumber(slug: string) {
  return guideChapters.findIndex(chapter => chapter.slug === slug) + 1;
}

/** Chapitres précédent et suivant, pour lire le guide comme un livre. */
export function neighbours(slug: string) {
  const index = guideChapters.findIndex(chapter => chapter.slug === slug);
  if (index < 0) return { previous: null, next: null };
  return { previous: guideChapters[index - 1] ?? null, next: guideChapters[index + 1] ?? null };
}

export function chaptersOf(part: GuidePart['id']) {
  return guideChapters.filter(chapter => chapter.part === part);
}

export const totalMinutes = guideChapters.reduce((sum, chapter) => sum + chapter.minutes, 0);

/** Lit la liste des chapitres lus enregistrée dans le navigateur ; ignore tout ce qui n'est pas un chapitre connu. */
export function parseRead(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return [...new Set(value.filter((slug): slug is string => typeof slug === 'string' && findChapter(slug) !== null))];
  } catch {
    return [];
  }
}

/** Premier chapitre pas encore lu : c'est là que « Continuer » emmène. */
export function nextUnread(read: string[]) {
  return guideChapters.find(chapter => !read.includes(chapter.slug)) ?? null;
}
