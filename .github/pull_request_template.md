## Type

<!-- Coche le type principal. Il apparaît aussi dans le titre : <type>(<scope>): <description> -->

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

## Comment tester

<!-- Étapes pour vérifier en local (`npm run dev`). Les branches dev-* ne sont pas déployées sur Vercel. -->

## Checklist

- [ ] Branche `dev-*`, PR vers `develop`, titre au format `<type>(<scope>): <description>`
- [ ] Commits au format `<type>(<scope>): <description>`, en anglais
- [ ] `npm run typecheck`, `npm test` et `npm run build` passent
- [ ] Tests ajoutés ou mis à jour pour la logique modifiée
- [ ] Aucun secret ajouté, nouvelles variables listées dans `.env.example`
- [ ] Migration générée si `db/schema.ts` a changé
- [ ] ADR ajouté dans `docs/decisions/` si c'est une décision d'architecture
