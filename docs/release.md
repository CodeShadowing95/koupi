# Mettre une version en production

Une release passe par deux PR : une vers `develop` qui fixe la version et le changelog, puis la PR de release `develop` → `main` qui met en production. `main` n'est jamais modifiée directement. Décision : [ADR-0011](decisions/0011-processus-de-release.md).

## Le cheminement

1. **Préparer** : sur ta machine, avec un dépôt sans modification en cours :

   ```bash
   npm run release -- --dry-run   # voir la version et le changelog, sans rien changer
   npm run release                # ou npm run bump
   ```

   Le script récupère `origin/develop`, lit les commits depuis le dernier tag `vX.Y.Z`, calcule la nouvelle version, met à jour `package.json`, `package-lock.json` et `CHANGELOG.md` sur une branche `dev-release-vX.Y.Z`, commite `chore(release): vX.Y.Z`, pousse et ouvre la PR vers `develop` (avec `gh` si il est installé et connecté, sinon il affiche le lien pour l'ouvrir).
2. **Relire et merger la PR vers `develop`** : relis le changelog, la CI doit être verte. `develop` est déployée en Preview sur Vercel : c'est la recette.
3. **PR de release** : l'Action `Release PR` (`.github/workflows/release-pr.yml`) ouvre toute seule la PR `chore(release): vX.Y.Z` de `develop` vers `main`, avec les notes de version. Si d'autres corrections arrivent sur `develop` avant le merge, elles partent avec.
4. **Mettre en production** : merge la PR de release avec **Create a merge commit**, jamais Squash ni Rebase. Un squash casse l'historique commun de `develop` et `main`, et la release suivante affiche de faux conflits.
5. **Automatique ensuite** : Vercel déploie `main` en Production. L'Action `Release` (`.github/workflows/release.yml`) crée le tag `vX.Y.Z` et la GitHub Release avec la section du changelog.

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
| La PR de release ne s'ouvre pas | Vérifier le réglage Actions ci-dessus et l'onglet Actions › Release PR. On peut aussi l'ouvrir à la main : base `main`, compare `develop`, titre `chore(release): vX.Y.Z`. |
| Pas de tag après le merge dans `main` | Onglet Actions › Release. L'Action ne fait rien si le tag existe déjà. Relancer le job suffit. |
