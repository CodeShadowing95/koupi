# ADR-0045 : Site public « Comptoir clair », accessible, thème clair par défaut et sombre au choix

## Statut
Proposée

## Date
2026-11-08

## Contexte
Le site public (Explorer, fiches outil et créateur, Présentation, formulaires, Merkod Studio) suivait la direction
« Comptoir de nuit » : fond bleu nuit, lueurs floues, texte clair souvent peu contrasté, accents corail et menthe en texte.
Plusieurs textes passaient sous le seuil WCAG AA (4,5:1), notamment le blanc sur corail et les petits libellés à opacité réduite.
Le propriétaire veut un design qui ne fatigue pas les yeux, utilisable par les personnes malvoyantes et daltoniennes,
avec un fond clair uni par défaut et un thème sombre, en gardant la structure façon YouTube et les couleurs des coupons.
Le back-office n'est pas concerné.

## Décision
- Toutes les couleurs du site public passent par des jetons déclarés sur `.kp` (thème clair) et redéfinis sous
  `:root[data-site-theme="dark"] .kp` (thème sombre). Fond uni blanc (#FFF), bordures fines, une seule couleur d'accent
  (bleu Merkod), boutons principaux noirs (blancs en sombre). Plus de lueurs ni de grille de points.
- Le thème sombre est une « nuit étoilée » : bleu nuit profond (#070B1A), cartes bleu encre, ciel d'étoiles discret fixé
  derrière le contenu (pseudo-éléments en CSS, scintillement lent coupé si l'utilisateur réduit les animations).
- Le thème est clair par défaut. Le choix du visiteur est gardé dans `localStorage` (`merkod-theme`, `lib/site-theme.ts`)
  et posé sur `<html>` par un petit script avant l'affichage (pas de flash). Bouton soleil / lune dans les barres du haut,
  interrupteur « Thème sombre » dans le tiroir de l'Explorer sur téléphone.
- Contrastes : texte au moins 4,5:1 dans les deux thèmes ; jetons de texte d'accent dédiés (`--coral-text`, `--mint`…)
  plus foncés en clair ; texte sombre (pas blanc) sur le corail ; champs bordés à 3:1 ; anneau de focus de 3 px.
- Daltonisme : l'élément choisi (rayon, pastille, onglet) est marqué par un fond inversé, du gras, une barre ou une coche,
  jamais par la couleur seule. Les liens dans le texte sont soulignés.
- Basse vision : texte de base à 16 px, plus petit texte à 12 px, titres en Inter (plus lisible que la police d'affiche).
- Les coupons gardent leur papier crème, leur talon bleu et leur corail ; le papier reste clair dans les deux thèmes.

## Alternatives envisagées
- **Suivre le réglage du système (prefers-color-scheme)** : écarté, le propriétaire veut le clair par défaut.
- **Réécrire site.css de zéro** : trop risqué pour une seule PR (près de 2 000 lignes partagées par toutes les pages) ;
  les jetons permettent de changer toute l'apparence sans casser la mise en page.

## Conséquences
- Toute nouvelle couleur du site public doit passer par un jeton (ou être vérifiée dans les deux thèmes).
- Le corail des réductions écrites sur le papier est plus foncé qu'avant (lisibilité AA).
- Le back-office garde son propre thème (`koupi-admin-theme`), sans lien avec celui du site.
