# ADR-0002 : Branches `dev-*` vers `develop`, puis `main`

## Statut
Acceptée

## Date
2026-10-31

## Contexte
Le projet est développé avec l'aide de Claude, et Vastolorde veut relire et valider chaque changement. Les premières PR visaient directement `main`.

## Décision
- `main` = ce qui est en production. `develop` = la branche d'intégration.
- Chaque changement part de `develop` sur une branche `dev-<sujet>` et revient dans `develop` par une PR relue et fusionnée par Vastolorde.
- Titre de PR : `dev-<sujet>: <type>(<scope>): …`. Commits : Conventional Commits, en anglais. Les types autorisés sont listés dans `CLAUDE.md`.
- Seul `README.md` peut être poussé directement.
- `develop` est fusionnée dans `main` pour mettre en ligne.
- Vercel ne déploie que `develop` (pré-production) et `main` (production). Les branches `dev-*` ne sont pas déployées (`git.deploymentEnabled` dans `vercel.json`).

## Alternatives envisagées
- **Tout sur `main` avec PR** : plus simple, mais chaque fusion part en production. Écartée.

## Conséquences
- La CI tourne sur les PR vers `develop` et `main`.
- Pas d'aperçu Vercel par PR : on vérifie en local et sur le déploiement de `develop` après fusion.
- Moins de builds Vercel consommés, et aucune branche de travail exposée en ligne.
