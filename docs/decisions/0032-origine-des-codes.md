# ADR-0032 : Origine de chaque code

## Statut
Acceptée

## Date
2026-11-05

## Contexte
Merkod trouve des codes de plusieurs façons : saisie à la main, propositions des visiteurs, import initial, recherche YouTube, lecture des podcasts suivis. D'autres sources arrivent (chaînes YouTube suivies, recherche IA sur le web, Spotify). Pour savoir quelle source vaut son coût (quota YouTube, budget IA), il faut savoir d'où vient chaque code, puis compter combien sont validés et copiés. Jusqu'ici, l'origine ne se lisait qu'à moitié : dans la note du journal, ou devinée d'après l'adresse de la source.

## Décision
Une colonne `codes.origin` (texte, obligatoire, `unknown` par défaut) avec une contrainte sur une liste fermée : `manual`, `submission`, `import`, `youtube_search`, `youtube_channel`, `podcast`, `ai_web`, `spotify`, `unknown`. La liste comprend déjà les sources prévues, pour ne pas changer la contrainte à chaque nouvelle source. Les libellés sont dans `lib/code-origin.ts`.

Chaque façon de créer un code enregistre son origine. Un code venu d'une suggestion d'outil garde l'origine de la suggestion (vidéo YouTube ou épisode de podcast).

La migration 0024 donne une origine aux codes déjà en base, dans cet ordre : import (clé d'import), proposition (lien vers la proposition), suggestion d'outil (adresse de la source), lecture de podcast ou recherche YouTube (note du journal de création), saisie à la main (création sans note). Ce qu'on ne peut pas deviner reste `unknown`.

L'origine n'est envoyée qu'à l'admin : le catalogue public ne la contient pas.

## Alternatives envisagées
- **Déduire l'origine à la lecture** (journal, adresse de la source) : rien à migrer, mais fragile (une note de journal n'est pas faite pour ça) et impossible à filtrer en base.
- **Une table des origines** : plus souple, mais une colonne suffit tant qu'un code n'a qu'une origine.
- **Un enum Postgres** : ajouter une valeur demande une migration à part ; une contrainte sur du texte est plus simple à faire évoluer, comme pour les autres statuts du schéma.

## Conséquences
- Codes et Vérifications affichent l'origine, et Codes se filtre par origine.
- La page Sources et les statistiques par source pourront compter les codes trouvés, validés et copiés par origine.
- Les codes saisis avant la migration sans journal clair restent « Inconnue ».
