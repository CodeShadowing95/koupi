// Conseil du jour de l'accueil admin : une idée courte à appliquer dans les tâches de la journée.
// Le conseil change chaque jour (même conseil toute la journée, dans l'ordre de la liste).
export type Tip = { title: string; text: string; href: string; cta: string };

export const TIPS: Tip[] = [
  { title: 'Un code testé vaut mieux que dix codes trouvés.', text: 'Les sites de codes promo perdent leurs visiteurs à cause des codes morts. Ta différence, c’est la vérification : 10 minutes de tests par jour suffisent pour faire grimper « Codes vérifiés ».', href: '/admin/codes?status=to_test', cta: 'Tester des codes →' },
  { title: 'Commence par la source.', text: 'Avant de valider une proposition, ouvre la vidéo ou le post : le code doit y être dit ou écrit par le créateur. Pas de source claire, pas de publication.', href: '/admin/propositions', cta: 'Ouvrir les propositions →' },
  { title: 'Un vieux test ne prouve plus rien.', text: 'Les marques changent leurs offres sans prévenir. Un code vérifié il y a plus de 30 jours mérite un nouvel essai avant qu’un visiteur tombe dessus.', href: '/admin/codes?status=retest', cta: 'Voir les codes à retester →' },
  { title: 'Les recherches vides sont ta liste de courses.', text: 'Quand un visiteur cherche un outil sans trouver de code, c’est une demande réelle. Va chercher un créateur qui en parle : c’est le code le plus utile à ajouter.', href: '/admin/stats#audience', cta: 'Voir les recherches sans résultat →' },
  { title: 'Une catégorie vide fait fuir.', text: 'Un visiteur qui ouvre une catégorie sans aucun code ne revient pas. Mieux vaut un code par catégorie que dix codes dans la même.', href: '/admin/categories', cta: 'Voir la couverture des catégories →' },
  { title: 'Écoute les votes.', text: 'Deux « ça n’a pas marché » d’affilée sur un code, c’est un signal : reteste-le aujourd’hui plutôt que d’attendre la date de rappel.', href: '/admin/codes', cta: 'Ouvrir les codes →' },
  { title: 'Crédite toujours le créateur.', text: 'Garde son nom exact et le lien de la vidéo. C’est ce qui rend Koupi différent des sites qui remplacent les codes des créateurs par les leurs.', href: '/admin/createurs', cta: 'Voir les créateurs →' },
];

/** Conseil du jour : le même toute la journée (heure de Paris), le suivant le lendemain. */
export function tipOfDay(now = new Date(), tips: Tip[] = TIPS): Tip {
  const day = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
  const index = Math.floor(Date.UTC(day.getFullYear(), day.getMonth(), day.getDate()) / 86_400_000);
  return tips[((index % tips.length) + tips.length) % tips.length];
}
