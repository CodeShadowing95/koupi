# Koupi

**Le code du créateur, vérifié.**

Koupi réunit au même endroit les codes promo que les créateurs (YouTube, podcasts, Instagram…) donnent pour des outils en ligne : hébergement, VPN, IA, logiciels pour freelances, outils de création. Chaque code est relié à la vidéo d'où il vient, crédite son créateur, et est testé par la communauté.

## Statut

V0 en préparation. Pas encore de site en ligne.

- Pas de compte utilisateur en V0 : les créateurs suivis sont gardés dans le navigateur, les alertes passent par e-mail (double opt-in).
- Web uniquement pour l'instant, pas d'application mobile.
- Hébergement de départ sur l'adresse par défaut de Vercel.

## Stack prévue

| Besoin | Choix | Pourquoi |
| --- | --- | --- |
| Application web | Next.js (App Router) + TypeScript | Pages rapides et bien référencées, un seul langage partout |
| Interface | Tailwind CSS + coss UI | Composants accessibles, restylés aux couleurs de Koupi |
| Base de données | Neon (Postgres) + Drizzle | Postgres serverless gratuit au départ, schéma typé |
| Recherche | `pg_trgm` dans Postgres | Recherche tolérante aux fautes sans service en plus |
| Hébergement | Vercel | Déploiement à chaque PR, aperçu automatique |
| E-mails | Resend + React Email | Alertes et confirmation d'inscription |
| Sourcing des codes | YouTube Data API v3 + extraction par IA | Lecture des descriptions de vidéos publiques |
| Anti-abus | Cloudflare Turnstile | Protège les formulaires sans captcha pénible |
| Mesure et erreurs | PostHog (sans cookie) + Sentry | Statistiques respectueuses de la vie privée |
| Tests | Vitest + Playwright | Tests unitaires et parcours de bout en bout |

## Plan de développement

1. **Données d'abord** : liste des 107 outils suivis, script de recherche YouTube, validation humaine des 100 premiers codes.
2. **Socle** : projet Next.js, base Neon, déploiement Vercel.
3. **Recherche et fiche outil** : trouver un outil, copier son code, ouvrir le site.
4. **Votes « ça marche / ça ne marche plus »** et page créateur.
5. **Proposer un code** et modération.
6. **Alertes e-mail** et trousseau de créateurs suivis.
7. **Bêta privée** avec une vingtaine de testeurs, puis ouverture.

## Comment on travaille

- Tout changement passe par une **pull request** relue et validée avant fusion dans `main`.
- Une PR = une étape ou une fonctionnalité, avec une description de ce qui change et comment le tester.
- Aucune clé ni secret dans le dépôt : ils vont dans les variables d'environnement (`.env.local` en local, réglages Vercel en ligne).
