## Résumé

<!-- Ce qui change et pourquoi, en quelques lignes. -->

## Comment tester

<!-- Étapes pour vérifier en local (`npm run dev`). Les branches dev-* ne sont pas déployées sur Vercel. -->

## Checklist

- [ ] Branche `dev-*`, PR vers `develop`, titre qui commence par le nom de la branche
- [ ] Commits au format Conventional Commits, en anglais
- [ ] `npm run typecheck`, `npm test` et `npm run build` passent
- [ ] Tests ajoutés ou mis à jour pour la logique modifiée
- [ ] Aucun secret ajouté, nouvelles variables listées dans `.env.example`
- [ ] Migration générée si `db/schema.ts` a changé
- [ ] ADR ajouté dans `docs/decisions/` si c'est une décision d'architecture
