# ADR-0027 : Photos des créateurs et logos des outils gardés en base

## Statut
Acceptée

## Date
2026-11-04

## Contexte
Les photos des créateurs (`npm run avatars`) et les logos des outils (`npm run logos`, ADR-0007) sont des fichiers de `public/`, listés dans un fichier JSON du dépôt. Un créateur ou un outil ajouté depuis l'admin reste sans image tant que quelqu'un ne relance pas le script en local et ne fusionne pas une PR. Lancer les scripts à chaque déploiement coûterait du quota YouTube à chaque build et laisserait quand même sans image ce qui arrive entre deux déploiements. La promesse « zéro pistage » interdit de charger l'image depuis Google ou le site de l'outil dans le navigateur du visiteur.

## Décision
- Une table `stored_images` garde au plus une image par créateur (ou par outil) : type, contenu en base64 (150 Ko au plus), adresse d'origine, date.
- Le serveur la télécharge lui-même, seulement depuis des domaines prévus (photos YouTube : `ggpht.com`, `googleusercontent.com`, `ytimg.com`), en https, sans redirection, et vérifie le type et la taille.
- Une photo de créateur arrive dès que sa chaîne YouTube est reliée (ajout d'un code, bouton « Relier les comptes »), et l'admin peut la récupérer (« Récupérer les photos ») ou l'actualiser (« Actualiser la photo »). Coût : 1 unité de quota par lot de 50 chaînes.
- Koupi la sert à `/media/avatars/<slug>.<ext>?v=<date>`, avec un cache long et une politique de contenu qui interdit tout script.
- Les images du dépôt restent en secours ; celle en base passe avant.

## Alternatives envisagées
- **Scripts au déploiement (`vercel.json`)** : quota consommé à chaque build, image toujours en retard sur l'admin.
- **Lien direct vers l'image de Google** : simple, mais le navigateur du visiteur contacte Google.
- **Stockage de fichiers (Vercel Blob)** : un service et une clé de plus pour quelques centaines de petites images.

## Conséquences
- Plus rien à lancer à la main pour un nouveau créateur qui a une chaîne YouTube.
- La base grossit d'environ 20 Ko par créateur.
- Les logos des outils suivront le même chemin (colonne `tool_id` déjà prévue).
