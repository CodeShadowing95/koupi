# ADR-0047 : Pages créateur à l'adresse /@nom, sans pages Codes ni Créateurs

## Statut
Acceptée

## Date
2026-11-09

## Contexte
La page principale (Explorer, à `/`) montre déjà tous les codes, avec ses rayons, ses familles, ses pastilles et la recherche.
La page `/codes` faisait double emploi et la liste `/creators` n'aidait pas le visiteur, qui vient chercher un code, pas un créateur.
Les pages créateur étaient à `/creators/nom`.

## Décision
- `/codes` et `/creators` sont retirées et redirigées (301) vers `/`. La requête suit : `family`, `q` et `creator` gardent leur sens sur l'Explorer.
- Les pages créateur passent à `/@nom` (et `/@nom/black-friday`, `/@nom/noel`), comme les chaînes YouTube. `routes.creator()` donne cette adresse ; l'ancienne `/creators/nom/…` redirige en 301.
- Next réserve les dossiers `@…` aux routes parallèles : la page reste dans `app/(explore)/creators/[slug]` et une réécriture `beforeFiles` (`creatorRewrites` dans `lib/legacy-redirects.mjs`) sert `/@nom` depuis ce dossier. Les redirections ne s'appliquent qu'à l'adresse demandée, donc pas de boucle.
- L'interrupteur admin « Pages créateur » (clé `creators`) couvre `/@…`. L'interrupteur « Codes » disparaît.

## Alternatives envisagées
- **`/c/nom`** : simple, mais moins parlant ; `/@nom` est déjà connu des visiteurs et des créateurs.
- **`/nom` à la racine** : risque de collision avec les pages du site (`/about`, `/submit`…).
- **Middleware** : même effet que la réécriture, mais du code de plus à chaque requête.

## Conséquences
- Les liens déjà partagés et indexés continuent de marcher (301). Le plan du site ne liste plus que les nouvelles adresses : le renvoyer dans la Search Console après la mise en production.
- Un nom de créateur commence toujours par une lettre ou un chiffre (slug) : `/@` ne capte aucune autre page.
