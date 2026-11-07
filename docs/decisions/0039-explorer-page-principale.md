# ADR-0039 : La page Explorer devient la page principale

## Statut
Acceptée

## Date
2026-11-07

## Contexte
Le visiteur de Merkod est pragmatique : il vient pour un code, le copie et repart. L'ancienne page d'accueil était une vitrine (hero, bandes défilantes, « Comment ça marche », règle Merkod) : les codes n'arrivaient qu'après plusieurs écrans. La page Explorer (PR #227) montre les codes tout de suite, avec une colonne de rayons, une recherche et une grille de coupons.

## Décision
- `/` sert la page Explorer (`app/(explore)/page.tsx`, sa propre coque sans l'en-tête ni le pied de page du site).
- L'ancienne page d'accueil devient la **Présentation** à `/about` (`app/(site)/about/page.tsx`), allégée : sans « Codes du moment », sans bandes défilantes, sans recherche dans le hero (bouton « Trouver un code » vers `/`), avec un bloc « Tu es créateur ? » et un ticket final « Voir tous les codes ».
- `/explore` redirige en permanence vers `/` en gardant ses filtres (`movedRedirects` dans `lib/legacy-redirects.mjs`).
- Interrupteurs de l'admin : « Accueil (Explorer) » reste verrouillé ; « Présentation » (`about`) peut être coupée ; « Codes » ne couvre plus que `/codes`.
- Les données structurées du site (`siteLd`) passent sur `/` ; `/about` entre dans le sitemap.

## Alternatives envisagées
- **Garder la vitrine en accueil et un lien vers Explorer** : rien à déplacer, mais le visiteur pressé doit encore chercher les codes.
- **Fusionner les deux pages** (vitrine sous la grille) : une seule adresse, mais la grille à défilement infini ne laisse jamais atteindre le bas.

## Conséquences
- Le lien « Présentation de Merkod » en bas de la colonne et dans le pied de page du site mène à `/about`.
- Les mesures de vitesse et les compteurs du groupe « accueil » parlent désormais de la page Explorer.
