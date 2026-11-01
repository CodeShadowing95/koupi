# Koupi

Site web qui réunit les codes promo donnés par les créateurs (YouTube, podcasts, Instagram…) pour des outils en ligne. Chaque code est relié à sa source, crédite son créateur et est vérifié. Voir `README.md` pour le produit et le plan.

## Stack

- Next.js 15.5 (App Router) + TypeScript strict, React 19. Dans les pages, `params` et `searchParams` sont des Promises : `const { slug } = await params`.
- Neon (Postgres serverless) + Drizzle ORM (`db/schema.ts`, migrations dans `db/migrations/`)
- Tests : Vitest. Les tests de base de données tournent sur PGlite (Postgres en mémoire) avec les vraies migrations.
- Hébergement : Vercel. Seules `develop` (pré-production) et `main` (production) sont déployées, jamais les branches `dev-*` (voir `vercel.json`).

## Commandes

- Installer : `npm ci`
- Dev : `npm run dev`
- Vérifier les types : `npm run typecheck`
- Tests : `npm test`
- Build : `npm run build`
- Générer une migration après un changement de `db/schema.ts` : `npm run db:generate`
- Appliquer les migrations : `npm run db:migrate` (besoin de `DATABASE_URL`). Sur Vercel, elles sont appliquées automatiquement avant chaque build (`buildCommand` dans `vercel.json`, voir ADR-0005).

Avant chaque commit : `npm run typecheck && npm test && npm run build` doivent passer. La CI (`.github/workflows/ci.yml`) refait ces vérifications sur chaque PR.

## Organisation du code

- `app/` : pages et routes API (App Router). `app/api/admin/*` est protégé par `middleware.ts`.
  - `app/(site)/` : site public, adresses en anglais (`/tools/[slug]`, `/creators/[slug]`, `/search`, `/submit`…), style `site.css` (classes `k-` sous `.kp`). Les anciennes adresses françaises redirigent (`lib/legacy-redirects.mjs`).
  - `app/admin/` : back-office, interface claire d'origine (`admin.css`, `components/admin-shell.tsx`).
- `lib/` : logique métier, testée à côté du fichier (`x.ts` → `x.test.ts`).
- `db/` : schéma Drizzle, connexion (`getDb()`), migrations.
- `components/` : composants partagés. `components/site/` pour le site public (coupon détachable, recherche, animations GSAP via `lib/gsap.ts`).
- `scripts/` : seed, migrations et récupération des logos des outils (`npm run logos`, voir ADR-0007).
- `docs/decisions/` : décisions d'architecture (ADR).

## Façon de travailler

- **Branches** : on part de `develop`. Chaque branche s'appelle `dev-<sujet>` (ex. `dev-votes`). La PR vise `develop`, jamais `main`. `develop` est fusionnée dans `main` pour les mises en production.
- **Titres de PR et commits** : strictement `<type>(<scope>): <description>`, en anglais, ex. `feat(votes): add vote buttons`. Le scope est obligatoire. Pas de préfixe de branche dans le titre. Un changement cassant prend un `!` (`feat(api)!: …`).
- **Types** (pour les commits et les PR) :

  | Type | Quand l'utiliser |
  | --- | --- |
  | `feat` | Nouvelle fonctionnalité visible |
  | `fix` | Correction de bug |
  | `style` | Mise en forme du code sans changement de comportement (indentation, espaces, points-virgules) |
  | `refactor` | Réorganisation du code sans changer le comportement ni corriger de bug |
  | `perf` | Amélioration des performances |
  | `test` | Ajout ou correction de tests |
  | `docs` | Documentation uniquement (README, ADR, CLAUDE.md, commentaires) |
  | `build` | Dépendances, build, configuration Next.js ou npm |
  | `ci` | CI et déploiement (GitHub Actions, `vercel.json`) |
  | `chore` | Maintenance qui ne touche ni le code de l'app ni les tests |
  | `revert` | Annulation d'un commit précédent |

  Un changement d'apparence de l'interface (CSS, design) est un `feat` ou un `fix`, pas un `style`.
- **Seul `README.md`** peut être poussé directement. Tout le reste passe par une PR que Vastolorde relit et fusionne.
- **Une PR = une étape** : petite, avec une description de ce qui change et comment le tester (voir `.github/pull_request_template.md`).
- **Décision d'architecture** (nouvelle dépendance importante, changement de service, de schéma ou de flux) : ajouter un ADR dans `docs/decisions/`.

## Cycle d'une fonctionnalité

Suivre les phases du plugin agent-skills quand il est disponible :

1. **Définir** : clarifier le besoin et écrire une courte spec (`spec-driven-development`).
2. **Planifier** : découper en tâches livrables une par une (`planning-and-task-breakdown`).
3. **Construire** : petits incréments, test d'abord pour la logique métier (`incremental-implementation`, `test-driven-development`). Vérifier la doc à jour des librairies avec Context7. Pour les animations, utiliser GSAP en suivant les skills du plugin `gsap-skills` (`gsap-react` avec `useGSAP`, `gsap-scrolltrigger`, `gsap-performance`) et respecter `prefers-reduced-motion`.
4. **Vérifier** : typecheck, tests et build (CI), puis test en local avec `npm run dev`. Après fusion, vérifier le déploiement de `develop`.
5. **Relire** : qualité et sécurité (`code-review-and-quality`, `security-and-hardening`).
6. **Livrer** : PR vers `develop`, puis checklist de mise en ligne (`shipping-and-launch`).

## Limites

- Jamais de secret dans le dépôt (le repo est public). Les clés vont dans `.env.local` en local, dans les réglages Vercel en ligne. `.env.example` liste les noms sans valeurs.
- Demander avant de modifier le schéma de base de données ou d'ajouter une dépendance.
- Ne jamais désactiver ni sauter un test pour faire passer la CI.
- La CI bloque si une dépendance de production a une faille de niveau high ou critical (`npm audit --omit=dev`). On corrige en mettant à jour, pas en désactivant le contrôle.
- Toute entrée utilisateur est validée côté serveur. Les formulaires publics sont protégés (Turnstile, limite de débit).
- Le texte de l'interface est en français.
