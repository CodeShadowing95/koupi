# Décisions d'architecture (ADR)

Chaque décision importante est notée ici dans un fichier numéroté. On ne supprime jamais un ADR : quand une décision change, on en écrit un nouveau qui remplace l'ancien.

| N° | Décision | Statut |
| --- | --- | --- |
| [0001](0001-neon-drizzle.md) | Neon + Drizzle à la place de Supabase | Acceptée |
| [0002](0002-branches-develop.md) | Branches `dev-*` vers `develop`, puis `main` | Acceptée |
| [0003](0003-next-15.md) | Passage à Next.js 15.5 et React 19 | Acceptée |
| [0004](0004-turnstile.md) | Cloudflare Turnstile sur le formulaire de proposition | Acceptée |
| [0005](0005-migrations-au-deploiement.md) | Migrations appliquées automatiquement au déploiement | Acceptée |
| [0006](0006-refonte-site-public.md) | Refonte du site public : GSAP, son synthétisé, adresses en anglais | Proposée |
| [0007](0007-logos-des-outils.md) | Logos des outils servis par Merkod (Simple Icons puis site officiel, initiale en repli) | Proposée |
| [0008](0008-chartjs-admin.md) | Chart.js pour les graphiques du back-office | Proposée |
| [0009](0009-catalogue-en-base.md) | Outils, créateurs et codes stockés dans Neon | Proposée |
| [0010](0010-audience-anonyme.md) | Votes et mesure d'audience anonymes, dans notre base | Proposée |
| [0011](0011-processus-de-release.md) | Releases par PR de release, version calculée depuis les commits | Proposée |
| [0012](0012-verifications-assistees.md) | Vérifications assistées : analyses et sources suivies en base | Proposée |
| [0013](0013-socle-ia.md) | Socle IA des vérifications avec le SDK Anthropic | Proposée |
| [0014](0014-retests-automatiques.md) | Retests automatiques par une tâche planifiée Vercel | Proposée |
| [0015](0015-date-de-fin-des-codes.md) | Date de fin facultative sur les codes | Proposée |
| [0016](0016-comptes-createurs.md) | Comptes des créateurs sur les réseaux | Proposée |
| [0017](0017-podcasts-apple.md) | Podcasts suivis avec l’annuaire Apple Podcasts | Proposée |
| [0018](0018-profil-createur.md) | Profil public des créateurs | Proposée |
| [0019](0019-demandes-createurs.md) | Revendications et signalements des pages créateurs | Proposée |
| [0020](0020-preuve-par-la-bio.md) | Preuve par la bio des comptes créateurs | Proposée |
| [0021](0021-connexion-des-createurs.md) | Connexion des créateurs par lien magique | Proposée |
| [0022](0022-administration-du-site.md) | Administration du site (pages, mode maintenance, comptes créateurs, journal) | Proposée |
| [0023](0023-outils-a-ajouter.md) | Outils à ajouter, depuis les codes lus dans les podcasts | Proposée |
| [0024](0024-analyse-ia-des-outils.md) | Analyse par l’IA des outils à ajouter | Proposée |
| [0025](0025-ia-sur-les-notes-des-podcasts.md) | Lecture des notes de podcast par l’IA | Proposée |
| [0027](0027-images-en-base.md) | Photos des créateurs et logos des outils gardés en base | Acceptée |
| [0028](0028-consommation-des-api.md) | Merkod compte lui-même sa consommation des API | Acceptée |
| [0029](0029-avis-des-visiteurs.md) | Page « Ton avis » et avis des visiteurs en base | Acceptée |
| [0030](0030-mesures-d-audience-des-comptes.md) | Mesures d'audience des comptes créateurs, quelle que soit la source | Acceptée |
| [0031](0031-pays-et-langue-des-createurs.md) | Pays et langue des créateurs | Acceptée |
| [0032](0032-origine-des-codes.md) | Origine de chaque code | Acceptée |
| [0033](0033-recherche-youtube-sans-doublon.md) | Recherche YouTube sans doublon, à formulations variées | Acceptée |
| [0034](0034-chaines-youtube-suivies.md) | Lire chaque nuit les chaînes YouTube suivies | Acceptée |
| [0035](0035-journal-des-passages-et-page-sources.md) | Journal des passages et page Sources | Acceptée |
| [0036](0036-podcasts-candidats-podcast-index.md) | Podcasts candidats depuis la base publique de Podcast Index | Acceptée |
| [0037](0037-avis-de-l-ia-dans-le-score.md) | L'avis de l'IA retire des points au score | Acceptée |
| [0038](0038-vitesse-ressentie-web-vitals.md) | Vitesse ressentie mesurée chez les visiteurs, comptée dans Neon | Acceptée |
| [0040](0040-offre-par-lien-sans-code.md) | Une offre peut se donner par un lien, sans code | Acceptée |
| [0041](0041-preuve-par-la-bio-en-libre-service.md) | Le créateur prouve son compte lui-même, avec son propre code | Acceptée |
| [0043](0043-studio-ouvert-sans-preuve.md) | Le Studio s'ouvre sans revendication ni preuve, sur une page non vérifiée | Acceptée |
| [0044](0044-relier-la-page-provisoire.md) | Une page provisoire est fusionnée dans la vraie page une fois celle-ci prouvée | Acceptée |
| [0045](0045-design-accessible-clair-sombre.md) | Site public « Comptoir clair » accessible, clair par défaut et sombre au choix | Proposée |
| [0046](0046-univers-du-catalogue.md) | Univers du catalogue : les marques hors outils gardées dans l’admin et cachées sur le site | Proposée |
| [0048](0048-supprimer-un-createur.md) | Supprimer un créateur à sa demande, avec tout ce qui le concerne | Acceptée |

Modèle : copier [`template.md`](template.md).
