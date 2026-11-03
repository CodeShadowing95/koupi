# ADR-0018 : Profil public des créateurs

## Statut
Proposée

## Date
2026-11-03

## Contexte
Le plan de l'espace créateur (doc de conception du 1er novembre, mis à jour le 3 novembre) commence par une page créateur qui dit qui il est, avant même qu'il la revendique. Jusqu'ici, la page `/creators/[slug]` n'affichait que le nom, l'avatar et les codes. Les comptes sur les réseaux existent en base (ADR-0016) mais n'étaient visibles que dans l'admin.

## Décision
- Colonne `creators.bio` (migration `0008_creator_bio`), facultative, 400 caractères au plus, jamais vide en base (vide → `null`). Écrite par l'admin dans « Modifier le profil », plus tard par le créateur lui-même.
- Les thèmes du créateur ne sont pas stockés : ils sont déduits des catégories des outils de ses codes visibles (`creatorCategories`), le plus fréquent d'abord.
- La page publique lit la présentation et les comptes avec `getCreatorProfile(slug)`, mis en cache sous la même étiquette que le catalogue. Toute modification d'un créateur ou d'un de ses comptes dans l'admin rafraîchit ce cache.
- Les comptes affichés sont tous ceux reliés au créateur, YouTube d'abord puis le plus suivi. Aucun badge par compte pour l'instant : la marque de confiance reste celle du niveau du créateur.
- Une requête qui ne contient pas de champ `bio` ne touche pas à la présentation.

## Conséquences
- Une colonne de plus, vide au départ : les pages restent comme avant tant que l'admin n'écrit rien.
- Une seconde lecture en base par page créateur (créateur + comptes), mise en cache 5 minutes comme le catalogue.
