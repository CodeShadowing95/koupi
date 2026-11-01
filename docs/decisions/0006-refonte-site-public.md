# ADR-0006 : Refonte du site public (GSAP, son synthétisé, adresses en anglais)

## Statut
Proposée

## Date
2026-10-31

## Contexte
Vastolorde veut un site public totalement nouveau, plus captivant et orienté conversion, construit à partir des composants 21st.dev, animé avec GSAP, avec un son de coupon quand on copie un code. Le back-office doit garder son interface claire actuelle. Les adresses des pages publiques doivent être en anglais.

## Décision
- **Deux mises en page séparées** : `app/(site)/` (site public, `site.css`, classes préfixées `k-` sous `.kp`) et `app/admin/` (`admin.css`, ancienne interface à l'identique). Le layout racine ne charge que les polices.
- **GSAP** (`gsap` + `@gsap/react`, licence gratuite depuis 2025, plugins ScrollTrigger, DrawSVG et Physics2D inclus) pour toutes les animations. Point d'entrée unique `lib/gsap.ts`. Chaque animation passe par `gsap.matchMedia()` : avec « réduire les animations », le contenu s'affiche sans mouvement.
- **Composants 21st.dev adaptés, sans Tailwind** : on reprend la mécanique (déchirure du talon de « Interactive Boarding Pass Ticket Card », notes reliées de « How It Works », bandeau défilant, compteur, halo au pointeur, bouton ticket) réécrite en CSS simple pour ne pas ajouter Tailwind ni toucher au back-office. Les sources sont citées en commentaire.
- **Son du coupon synthétisé** avec la Web Audio API (`lib/coupon-sound.ts`) : aucun fichier audio, donc aucune licence tierce. Il ne joue qu'après un clic et peut être coupé depuis l'en-tête (préférence gardée dans le navigateur).
- **Adresses en anglais** (`/tools`, `/creators`, `/search`, `/submit`, `/keyring`, `/transparency`, `/legal`, `/privacy`) avec redirections permanentes depuis les anciennes adresses françaises (`lib/legacy-redirects.mjs`). Le texte affiché reste en français.

## Alternatives envisagées
- **Installer Tailwind + shadcn pour coller les composants 21st.dev tels quels** : plus rapide à copier, mais nouvelle chaîne de build, styles globaux (preflight) qui toucheraient le back-office, et la plupart des composants utilisent Motion, qu'on remplace par GSAP de toute façon.
- **Fichier audio libre de droits** : dépend d'une licence à suivre et d'un téléchargement ; la synthèse est plus légère et réglable.

## Conséquences
- +2 dépendances de production (`gsap`, `@gsap/react`), environ 50 ko de JS en plus sur les pages animées.
- Le plan gratuit de 21st.dev limite à 2 récupérations de code par jour : les autres composants sont réécrits d'après leur description.
- Les liens externes vers les anciennes adresses continuent de marcher grâce aux redirections.
