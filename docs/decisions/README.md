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

Modèle : copier [`template.md`](template.md).
