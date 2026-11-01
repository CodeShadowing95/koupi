# ADR-0001 : Neon + Drizzle à la place de Supabase

## Statut
Acceptée (PR #2, `dev-neon`)

## Date
2026-10-31

## Contexte
La V0 générée par Bolt utilisait Supabase. Le plan prévoyait Postgres serverless gratuit au départ, un schéma typé en TypeScript, et des tests de base de données rapides sans service externe.

## Décision
Neon (Postgres serverless) en production, via `@neondatabase/serverless` et Drizzle ORM (`drizzle-orm/neon-http`). Le schéma vit dans `db/schema.ts`, les migrations SQL dans `db/migrations/` (générées par `drizzle-kit`). Les tests tournent sur PGlite avec ces mêmes migrations.

## Alternatives envisagées
- **Supabase** : complet (auth, stockage), mais on n'a pas de compte utilisateur en V0 et on voulait éviter un client spécifique. Écartée.
- **Prisma** : mature, mais client plus lourd en serverless et migrations moins proches du SQL. Écartée.

## Conséquences
- Une seule variable `DATABASE_URL` à configurer (local et Vercel).
- `pg_trgm` reste disponible pour la recherche tolérante aux fautes.
- Toute modification de schéma passe par `npm run db:generate` puis une migration relue dans la PR.
