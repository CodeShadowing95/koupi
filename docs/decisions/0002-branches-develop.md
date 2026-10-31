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
- Titre de PR : `dev-<sujet>: …`. Commits : Conventional Commits, en anglais.
- Seul `README.md` peut être poussé directement.
- `develop` est fusionnée dans `main` pour mettre en ligne.

## Alternatives envisagées
- **Tout sur `main` avec PR** : plus simple, mais chaque fusion part en production. Écartée.

## Conséquences
- La CI tourne sur les PR vers `develop` et `main`.
- Vercel crée un aperçu pour chaque branche `dev-*`.
