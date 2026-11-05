# ADR-0031 : Pays et langue des créateurs

## Statut
Acceptée (demande de l'éditeur, 2026-11-05)

## Date
2026-11-05

## Contexte
L'éditeur veut cibler sa communication selon la langue des créateurs (francophones d'abord, puis anglophones…). Aucune source ne donne le pays de façon fiable : YouTube le donne seulement si le créateur l'a rempli, Apple Podcasts jamais (le pays de la boutique n'est pas celui du créateur).

## Décision
- Le pays (ISO 3166, deux lettres) et la langue (ISO 639-1) vivent dans le champ souple `creator_accounts.metrics` (ADR-0030) : pas de migration.
- YouTube : `snippet.country` et `snippet.defaultLanguage` de la chaîne, lus dans le même appel que les abonnés. Podcast : la balise `<language>` du début du flux RSS (64 Ko lus au plus, mêmes garde-fous que `lib/site-reader.ts` : https, domaine public, redirections vérifiées).
- Sans langue donnée, elle est devinée sur le titre et la description par les petits mots les plus courants (`lib/language-guess.ts`, sans dépendance). Pas de réponse si le texte est trop court ou ambigu.
- L'admin peut corriger pays et langue sur un compte ; `localeManual` empêche une actualisation de les remplacer.
- Le pays et la langue d'un créateur viennent d'abord d'une correction à la main, puis de sa chaîne YouTube, puis de ses autres comptes (`lib/creator-locale.ts`).
- « Actualiser les comptes » relit toutes les chaînes (lots de 50) et 15 podcasts par clic, les moins récemment relus d'abord.

## Alternatives envisagées
- **Colonnes `country` et `language` sur `creators`** : plus simple à filtrer en SQL, mais une migration, et on perdrait la source de chaque valeur.
- **Détection de langue par l'IA** : plus juste sur les textes courts, mais payante et inutile pour une centaine de créateurs.

## Conséquences
- Le filtre par langue ou par pays se fait côté admin, sur les comptes chargés (quelques centaines au plus).
- Le pays restera souvent vide pour les podcasts : la langue sert de critère principal.
