## Type

<!-- Coche le type principal. Il apparaît aussi dans le titre : <type>(<scope>): <Description> -->

- [ ] `feat` : nouvelle fonctionnalité
- [ ] `fix` : correction de bug
- [ ] `style` : mise en forme du code, sans changement de comportement
- [ ] `refactor` : réorganisation du code, sans changement de comportement
- [ ] `perf` : performances
- [ ] `test` : tests
- [ ] `docs` : documentation
- [ ] `build` : dépendances, build
- [ ] `ci` : CI, déploiement
- [ ] `chore` : maintenance
- [ ] `revert` : annulation
- [ ] Changement cassant (`!`)

## Résumé

<!-- Ce qui change et pourquoi, en quelques lignes. -->

## Argument

<!-- Fonctionnalité visible seulement : l'argument qu'elle apporte et pour qui (visiteurs, créateurs, agences, marques). Il est reporté dans `extras/arguments.md`. Sinon, écrire « Aucun ». -->

## Comment tester

<!-- Étapes pour vérifier en local (`npm run dev`). Les branches dev-* ne sont pas déployées sur Vercel. -->

## Checklist

- [ ] Branche `dev-*`, PR vers `develop`, titre au format `<type>(<scope>): <Description>` (description avec une majuscule)
- [ ] Commits au format `<type>(<scope>): <Description>`, en anglais, description avec une majuscule
- [ ] `npm run typecheck`, `npm test` et `npm run build` passent
- [ ] Tests ajoutés ou mis à jour pour la logique modifiée
- [ ] Aucun secret ajouté, nouvelles variables listées dans `.env.example`
- [ ] Migration générée si `db/schema.ts` a changé
- [ ] `extras/arguments.md` mis à jour (ou section « Argument » remplie) si la fonctionnalité est visible
- [ ] ADR ajouté dans `docs/decisions/` si c'est une décision d'architecture
