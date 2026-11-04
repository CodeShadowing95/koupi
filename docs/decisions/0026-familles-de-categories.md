# ADR-0026 : Familles de catégories

## Statut
Acceptée

## Date
2026-11-04

## Contexte
Les 12 catégories d'origine mélangent plusieurs besoins (« VPN et sécurité », « Finance et freelance », « Création et design »…). Une liste plus fine, d'environ 50 catégories nommées d'après le besoin du visiteur, est trop longue pour servir de menu. Il faut un niveau au-dessus : la famille (Sécurité et vie privée, Vidéo, Argent et indépendants…).

## Décision
Une table `category_families` (slug, nom unique, position dans le menu) et une colonne `categories.family_slug` qui la référence (`on delete set null`, `on update cascade`). Une catégorie a au plus une famille ; un outil garde une seule catégorie.

La clé est le slug, comme pour les catégories : les adresses du site restent lisibles. La migration crée les 14 familles retenues et range les 12 catégories d'origine dans la plus proche. Le reclassement vers les nouvelles catégories viendra dans une PR suivante.

## Alternatives envisagées
- **Colonne texte `family` sur `categories`** : plus simple, mais un nom de famille peut exister en deux orthographes, et le renommer touche toutes les catégories. Il n'y a pas non plus de place pour l'ordre d'affichage.
- **Table de correspondance dans le code** : aucun changement de schéma, mais l'admin ne peut pas déplacer une catégorie sans une PR.
- **Identifiant numérique** : inutile ici, le slug est stable et lisible.

## Conséquences
- L'admin choisit la famille d'une catégorie dans le formulaire « Modifier » et filtre la page Catégories par famille.
- Une famille supprimée laisse ses catégories « Sans famille » au lieu de les supprimer.
- Une base neuve importe les catégories de `data/` sans famille, tant que le reclassement ne les a pas ajoutées aux données.
