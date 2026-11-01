# ADR-0011 : Releases par PR de release, version calculée depuis les commits

## Statut
Proposée

## Date
2026-11-01

## Contexte
`develop` était fusionnée dans `main` à la main, sans numéro de version, sans tag ni notes de version. Vastolorde veut un processus professionnel déclenché par une commande (`npm run bump`), qui monte la version, tient un changelog, crée les tags et met `develop` en production. `main` est protégée : tout passe par PR.

## Décision
- `npm run release` (alias `npm run bump`, `scripts/release.mjs`) calcule la version depuis les commits conventionnels depuis le dernier tag, met à jour `package.json`, `package-lock.json` et `CHANGELOG.md` sur une branche `dev-release-vX.Y.Z` et ouvre la PR vers `develop`.
- L'Action `Release PR` ouvre la PR de release `develop` → `main` quand `develop` a une version plus récente que `main`.
- Au merge dans `main` (merge commit uniquement), Vercel déploie la production et l'Action `Release` crée le tag `vX.Y.Z` et la GitHub Release.
- Aucune dépendance npm ajoutée : la logique est dans `scripts/release-lib.mjs`, testée par `lib/release.test.ts`.
- Mode d'emploi : `docs/release.md`.

## Alternatives envisagées
- **Script qui merge `develop` dans `main` directement** : une commande au lieu d'un clic, mais il faut lever la protection de `main` et la CI ne bloque plus une version rouge.
- **release-please** : très répandu, mais pensé pour une seule branche (trunk-based). Avec `develop` + `main`, il faut contourner son fonctionnement.
- **semantic-release** : publie à chaque push sur `main`, sans porte de contrôle humaine, et pousse lui-même sur `main`.
- **Changesets** : un fichier à écrire par PR, utile pour des bibliothèques, superflu pour une application.
- **commit-and-tag-version** : tague en local, avant la production, donc un tag peut désigner un commit jamais déployé.

## Conséquences
- Deux PR par release, la seconde se merge en un clic. La prod ne bouge que sur décision explicite.
- Le tag est posé sur le commit réellement déployé sur `main`.
- La PR de release ne doit jamais être squashée. Sur `main`, seule la méthode Merge est autorisée.
- Les titres de commit hors format n'apparaissent pas dans le changelog : la règle Conventional Commits devient indispensable.
