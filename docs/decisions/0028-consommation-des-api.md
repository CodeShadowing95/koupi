# ADR-0028 : Merkod compte lui-même sa consommation des API

## Statut
Acceptée

## Date
2026-11-04

## Contexte
Merkod lit YouTube (10 000 unités gratuites par jour) et appelle l'IA sous un plafond mensuel. L'admin veut voir où il en est sans ouvrir la console Google ni celle d'Anthropic. L'API YouTube ne donne pas le quota utilisé : seule la console Google Cloud l'affiche, avec du retard. D'autres sources viendront (Spotify, Podcast Index…).

## Décision
- Une table `api_usage` garde, par service et par jour de quota du service, les unités consommées et le nombre d'appels. Le jour YouTube change à minuit heure du Pacifique.
- Tous les lecteurs YouTube de `lib/` utilisent par défaut `youtubeFetch` (`lib/api-usage.ts`) : il fait l'appel puis ajoute ses unités (100 pour une recherche, 1 pour une lecture), même si YouTube refuse la requête. Un comptage raté ne casse jamais l'appel. Sans `DATABASE_URL` (tests, scripts locaux), rien n'est noté.
- L'IA n'a pas de nouveau compteur : son coût est déjà écrit à chaque appel (`ai_usage`, `verification_checks`, `tool_suggestions`) et relu par jour.
- La page `/admin/consommation` détaille les 30 derniers jours (barres orange à 70 %, rouges à 90 %). Une jauge dans le menu a été essayée puis retirée (2026-11-04) car elle obligeait à faire défiler le menu ; elle revient le 2026-11-05 à la demande de l'éditeur, en version compacte (une ligne par service) dans le bas fixe du menu, relue chaque minute par `/api/admin/usage?gauge=1`.
- Un nouveau service s'ajoute dans `API_SERVICES` avec son quota et son fuseau, puis son fetch compté.

## Alternatives envisagées
- **API Cloud Monitoring de Google** : chiffres officiels, mais un compte de service, une clé de plus et plusieurs minutes de retard.
- **Compteur en mémoire** : perdu à chaque démarrage d'une fonction Vercel.
- **Une ligne par appel** : plus précis, mais la table grossit sans utilité ; un total par jour suffit.

## Conséquences
- Une écriture en base de plus par appel YouTube.
- Le compteur ignore les appels faits en dehors de Merkod avec la même clé (scripts lancés en local, console Google) : la console Google reste la référence en cas de doute.
