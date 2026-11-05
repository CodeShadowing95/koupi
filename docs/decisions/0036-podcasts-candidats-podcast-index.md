# ADR-0036 : Podcasts candidats depuis la base publique de Podcast Index

## Statut
Acceptée

## Date
2026-11-05

## Contexte
Les podcasts suivis viennent d'une recherche par nom ou des classements d'Apple : on ne trouve que ce qu'on connaît déjà ou ce qui est en tête. Podcast Index publie chaque semaine toute sa base (plus de 4 millions de podcasts, environ 2 Go compressés, au format SQLite), sans compte. Son API demande une inscription refusée aux adresses Gmail (ADR-0017). La base est trop lourde pour une fonction Vercel (mémoire, disque et durée limités).

## Décision
Un script (`scripts/podcast-index-candidates.ts`) tourne chaque lundi dans une GitHub Action (`.github/workflows/podcast-index.yml`), qui télécharge et décompresse la base :

1. Il demande à Merkod (`GET /api/cron/podcast-index`) les outils du catalogue et les podcasts déjà suivis.
2. Il choisit dans la base les podcasts vivants, connus d'Apple (`itunesId`), actifs depuis 90 jours, en français ou en anglais, en Technology, Business ou Education, les plus populaires d'abord (3 000 au plus).
3. Il lit leurs flux RSS (12 à la fois, 15 s et 4 Mo au plus par flux) et cherche, dans les épisodes des 90 derniers jours, un outil du catalogue près d'un code, avec le repérage sans IA des podcasts suivis (`lib/podcast-codes.ts`).
4. Il envoie les candidats (500 au plus, 5 codes chacun) à `POST /api/cron/podcast-index`, qui relit chaque champ et ne garde que les outils du catalogue.

Les deux appels utilisent `CRON_SECRET`, le secret des tâches de nuit. Côté GitHub, il faut le secret `CRON_SECRET` et la variable `MERKOD_URL` ; sans eux, l'Action s'arrête sans erreur.

Une table `podcast_candidates` (unique par identifiant Apple) garde le podcast, ses chiffres, les codes repérés au dernier passage (`hits`, JSON) et son état (`new` ou `dismissed`). Un passage met à jour les chiffres sans toucher à l'état : un candidat écarté le reste. L'onglet « Candidats » de Podcasts les montre ; « Suivre » passe par le suivi existant (identifiant Apple), et un candidat suivi n'est plus montré.

La base est lue avec `node:sqlite`, intégré à Node 22 : aucune dépendance ajoutée.

## Alternatives envisagées
- **API Podcast Index** : inscription impossible avec une adresse Gmail ; à revoir avec un domaine à nous.
- **Script dans une fonction Vercel** : la base ne tient pas dans ses limites.
- **Librairie SQLite (better-sqlite3)** : une dépendance native de plus, alors que Node la fournit.
- **Écrire directement en base depuis l'Action** : il faudrait confier `DATABASE_URL` à GitHub. Passer par une route bornée et relue donne moins de droits.
- **Créer directement des codes en attente** : trop de bruit sans avoir choisi le podcast ; le suivi garde l'admin maître de ses sources.

## Conséquences
- De nouveaux podcasts à suivre arrivent chaque semaine, déjà triés sur la présence d'un code.
- `node:sqlite` est encore marqué expérimental (un avertissement s'affiche) ; si son API change, seul le script est touché.
- La table garde au plus quelques milliers de lignes ; pas de purge pour l'instant.
- Podcast Index n'a pas de carte sur la page Sources : il ne trouve pas de codes lui-même.
