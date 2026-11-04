# Mettre une version en production

Une release se lance avec **une seule commande**, `npm run release`. Tout le reste est automatique : deux PR se mergent toutes seules dès que la CI est verte, puis la production est déployée et taguée. `main` n'est jamais modifiée directement. Décision : [ADR-0011](decisions/0011-processus-de-release.md).

## Le cheminement

1. **Tester la recette** : la Preview de `develop` sur Vercel. Lancer la release, c'est décider que `develop` part en production.
2. **Lancer** : sur ta machine, avec un dépôt sans modification en cours :

   ```bash
   npm run release -- --dry-run   # voir la version et le changelog, sans rien changer
   npm run release                # ou npm run bump
   ```

   Le script récupère `origin/develop`, lit les commits depuis le dernier tag `vX.Y.Z`, calcule la nouvelle version, met à jour `package.json`, `package-lock.json`, la version affichée dans `README.md` et `CHANGELOG.md` sur une branche `dev-release-vX.Y.Z`, commite, pousse, ouvre la PR vers `develop` et active son **auto-merge** (avec `gh` si il est installé et connecté, sinon il affiche le lien pour l'ouvrir et la PR se merge à la main).
3. **Automatique** : la PR de version se merge dans `develop` quand la CI est verte.
4. **Automatique** : l'Action `Release PR` (`.github/workflows/release-pr.yml`) ouvre la PR `chore(release): Release vX.Y.Z` de `develop` vers `main` et active son auto-merge. Elle se merge (merge commit) quand la CI est verte.
5. **Automatique** : Vercel déploie `main` en Production. L'Action `Release` (`.github/workflows/release.yml`) crée le tag `vX.Y.Z` et la GitHub Release avec la section du changelog.

Si un check est rouge, rien ne se merge : la chaîne s'arrête sur la PR concernée. On corrige par une PR normale vers `develop` (la PR de release se met à jour toute seule), ou on merge à la main une fois le problème réglé.

### Ce qu'il faut pour que tout soit automatique

- **Settings › General › Pull Requests** : cocher « Allow auto-merge ».
- **Secret `RELEASE_TOKEN`** (Settings › Secrets and variables › Actions) : un jeton GitHub *fine-grained* du propriétaire du dépôt, limité au dépôt `koupi`, avec les permissions *Contents : Read and write* et *Pull requests : Read and write*. Grâce à lui, la PR de release est ouverte et mergée au nom du propriétaire : la CI s'y lance sans « Approve and run », et le merge déclenche l'Action `Release`. Sans ce secret, la PR de release s'ouvre mais attend un merge manuel (**Create a merge commit**, jamais Squash ni Rebase). Le jeton expire : le renouveler à sa date d'expiration.

## Comment la version est calculée

Les titres de commit suivent `<type>(<scope>): <description>` (voir `CLAUDE.md`).

| Commits depuis la dernière version | Nouvelle version |
| --- | --- |
| Au moins un changement cassant (`feat(api)!: …` ou `BREAKING CHANGE:` dans le corps) | majeure (`1.4.2` → `2.0.0`). Avant `1.0.0` : mineure (`0.4.2` → `0.5.0`) |
| Au moins un `feat` | mineure (`0.4.2` → `0.5.0`) |
| Au moins un `fix`, `perf` ou `revert` | correctif (`0.4.2` → `0.4.3`) |
| Seulement `docs`, `chore`, `style`, `test`, `ci`, `build`, `refactor` | rien : le script s'arrête |

Pour forcer : `npm run release -- --patch`, `--minor`, `--major`, ou un numéro précis (`npm run release -- 1.0.0`). Le passage en `1.0.0` se fera ainsi au lancement public.

Le changelog ne liste que les changements visibles (cassants, nouveautés, corrections, performances, annulations). Les commits de merge et les titres hors format sont ignorés.

## Correctif urgent en production (hotfix)

1. Branche `dev-hotfix-<sujet>` créée depuis `main`, PR vers `main` avec un titre `fix(<scope>): …`. La merger ne crée pas de version tant que `package.json` ne change pas.
2. `npm run release -- --base main --patch` : prépare la version sur `dev-release-vX.Y.Z` depuis `main` et ouvre la PR vers `main`. Au merge, le tag et la GitHub Release sont créés.
3. Ouvrir une PR `main` → `develop` pour que le correctif et la version reviennent dans `develop` (merge commit).

## Réglages GitHub nécessaires

- Règles sur `main` et `develop` : PR obligatoire, checks « Typecheck, tests, build » et « Dependency audit » obligatoires, suppression et force push interdits. Sur `main`, seule la méthode **Merge** est autorisée.
- Settings › Actions › General : cocher « Allow GitHub Actions to create and approve pull requests » (sinon `Release PR` ne peut pas ouvrir la PR).
- La PR de release est ouverte par GitHub Actions, donc la CI ne se relance pas dessus : ses checks sont ceux du dernier push sur `develop`, qui portent sur le même commit.

## Si quelque chose bloque

| Message ou symptôme | Cause et solution |
| --- | --- |
| « Des fichiers sont modifiés » | Commite ou `git stash` avant `npm run release`. |
| « déjà en version X, pas encore en production » | Une release attend sur `develop` : merge la PR de release vers `main` d'abord. |
| « ni feat, ni fix… » | Rien de visible depuis la dernière version. `--patch` pour publier quand même. |
| La PR de release ne s'ouvre pas | Vérifier le réglage Actions ci-dessus et l'onglet Actions › Release PR. On peut aussi l'ouvrir à la main : base `main`, compare `develop`, titre `chore(release): Release vX.Y.Z`. |
| Pas de tag après le merge dans `main` | Onglet Actions › Release. L'Action ne fait rien si le tag existe déjà. Relancer le job suffit. |
