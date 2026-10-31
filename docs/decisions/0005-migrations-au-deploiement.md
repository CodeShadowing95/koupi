# ADR-0005 : Migrations appliquées automatiquement au déploiement

## Statut
Acceptée

## Date
2026-10-31

## Contexte
Les migrations étaient lancées à la main (`npm run db:migrate`). Après la fusion de la limite d'essais, `develop` utilisait une base Neon (créée par l'intégration Neon pour les previews) où la table `rate_limits` n'existait pas : les propositions échouaient en 500 jusqu'à une correction manuelle. Le code et le schéma de la base peuvent donc se désynchroniser.

## Décision
- Vercel lance `npm run db:migrate && npm run build` (`buildCommand` dans `vercel.json`). Les migrations sont appliquées sur la base de `DATABASE_URL` de l'environnement déployé (Preview pour `develop`, Production pour `main`), avant le build.
- Si les migrations échouent ou si `DATABASE_URL` manque, le build échoue et l'ancienne version reste en ligne.
- La CI GitHub ne lance pas les migrations : elle n'a pas accès à la base.

## Alternatives envisagées
- **Continuer à la main** : c'est ce qui a causé la panne. Écartée.
- **Migrations dans GitHub Actions après fusion** : demande de mettre `DATABASE_URL` dans les secrets GitHub et ne suit pas les bases propres à chaque environnement Vercel. Écartée.
- **Migrations au démarrage de l'app** : chaque fonction serverless les relancerait. Écartée.

## Conséquences
- Une migration doit rester compatible avec la version encore en ligne pendant le build (ajouter avant de supprimer), car elle s'applique avant que le nouveau code soit servi.
- Drizzle note les migrations déjà appliquées : les relancer à chaque déploiement ne refait rien.
- `npm run db:migrate` reste disponible pour une base locale ou un besoin ponctuel.
