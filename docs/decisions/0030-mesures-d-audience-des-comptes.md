# ADR-0030 : Mesures d'audience des comptes créateurs, quelle que soit la source

## Statut
Acceptée (choix de l’éditeur, 2026-11-05)

## Date
2026-11-05

## Contexte
L'audience d'un créateur se résumait au nombre d'abonnés (`creator_accounts.subscribers`). Un podcast n'en a pas de public : l'admin affichait « Abonnés inconnus » pour tous les podcasts Apple. D'autres sources viendront (Spotify…), chacune avec ses propres chiffres : note, nombre de notes, épisodes, vues, vidéos.

## Décision
- Deux colonnes sur `creator_accounts` : `metrics` (JSON, objet vide par défaut) et `metrics_at` (date du dernier relevé). La forme est décrite et validée dans `lib/account-metrics.ts` (`cleanMetrics`) : `rating` (sur 5), `ratingCount`, `ratingSource`, `episodes`, `views`, `videos`.
- `subscribers` reste une colonne à part : c'est elle qui compte pour le seuil de contrôle (1 000 abonnés).
- « Actualiser » sur un compte appelle le lecteur de sa plateforme (`AudienceReader`, branché dans la route `/api/admin/creator-accounts/[id]/refresh`). Podcast : épisodes par l'API iTunes, note et nombre de notes lus sur la page publique podcasts.apple.com (`lib/apple-podcast-rating.ts`), l'API ne les donnant pas. YouTube : vues et vidéos viennent avec les abonnés, dans le même appel (1 unité).
- Une lecture partielle n'efface rien (`mergeMetrics`) : si Apple change sa page et que la note ne se lit plus, les épisodes sont mis à jour et l'ancienne note reste.
- Une nouvelle source (Spotify…) ajoute ses champs dans `AccountMetrics` et son lecteur dans `readAudience`, sans migration.
- Sur le site, la page créateur montre abonnés, note et épisodes ; les vues et vidéos YouTube restent dans l'admin.

## Alternatives envisagées
- **Colonnes fixes** (note, notes, épisodes…) : plus strictes, mais une migration à chaque nouvelle mesure ou source.
- **Table de mesures datées** (une ligne par mesure et par relevé) : donnerait un historique, mais plus lourde à écrire et à lire. Elle pourra venir si on veut des courbes d'évolution.

## Conséquences
- Le JSON n'est pas contraint par Postgres au-delà d'« être un objet » : toute écriture passe par `cleanMetrics`.
- La note Apple dépend de la page web d'Apple ; si sa structure change, la lecture rend null (testée sur un extrait réel de la page).
- Seuil des podcasts (choix de l'éditeur, 2026-11-05) : un podcast contrôlé par l'admin passe « Contrôlé par Merkod » à partir de 50 notes (`MIN_RATINGS`), l'équivalent des 1 000 abonnés d'une chaîne.
