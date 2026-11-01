# ADR-0009 : Outils, créateurs et codes stockés dans Neon

## Statut
Proposée

## Date
2026-11-01

## Contexte
Le catalogue (outils, codes) était généré à partir des fichiers de `data/` dans `lib/catalog.json`, lu au build. Les actions de l'admin (tester, vérifier, rejeter, modifier), les codes validés depuis les propositions et les votes des visiteurs ne pouvaient donc pas être enregistrés. Les créateurs viendront de tous les réseaux (YouTube, TikTok, Instagram, Snap…) et devront pouvoir être vérifiés.

## Décision
- Quatre tables : `categories`, `tools`, `creators`, `codes` (migration `0002_catalog`).
- `creators` ne dépend d'aucun réseau : les comptes sociaux et leur vérification viendront dans une table reliée à `creators.id`, sans toucher aux codes. Le lien d'affiliation et la source restent sur chaque code.
- Un code n'est jamais supprimé : il est archivé (`archived_at`). Les votes sont gardés en « ça marche » / « ça ne marche pas » (`votes_up`, `votes_down`), le taux est calculé. `last_tested_at` prépare le rappel « à retester ».
- `data/` ne sert plus qu'à remplir la base : `npm run db:import` ajoute ce qui manque, sans jamais modifier une ligne existante, et tourne à chaque déploiement Vercel après les migrations.
- Les pages lisent la base avec `getCatalog()` (`lib/catalog-server.ts`), mis en cache avec l'étiquette `catalog` (5 minutes au plus) et rafraîchi dès que l'admin modifie quelque chose. Elles sont rendues à la demande, plus au build.

## Alternatives envisagées
- **Garder les fichiers et les modifier depuis l'admin** : impossible sur Vercel (système de fichiers en lecture seule), et chaque changement demanderait un déploiement.
- **Créateur en simple texte sur le code** : plus rapide, mais il faudrait tout reprendre pour la vérification des créateurs multi-réseaux.

## Conséquences
- Toutes les interactions avec les codes peuvent être enregistrées (prochaines PR : actions de l'admin, propositions validées, votes, compteurs).
- Le site dépend de la base pour s'afficher : si Neon est injoignable, les pages du catalogue sont en erreur (le cache limite les requêtes).
- `lib/catalog.json` reste pour les scripts des logos et des avatars.
