# ADR-0017 : Podcasts suivis avec l'annuaire Apple Podcasts

## Statut
Proposée

## Date
2026-11-02

## Contexte
Après YouTube, les podcasts sont la deuxième source de codes (spec des vérifications). Les animateurs lisent des publicités sponsorisées et répètent le code dans les notes de l'épisode. L'admin doit pouvoir choisir les podcasts suivis, puis Merkod lit leurs nouveaux épisodes pour y trouver des codes, qui passent par Vérifications.

Le plan prévoyait l'API Podcast Index. Elle refuse désormais les inscriptions depuis une adresse Gmail ou Outlook, et Merkod n'a pas encore d'adresse sur son propre domaine.

## Décision
- On utilise l'**annuaire Apple Podcasts** (iTunes Search API) : `search` pour trouver un podcast, `lookup?id=…` pour le relire, `lookup?id=…&entity=podcastEpisode` pour ses derniers épisodes avec leurs notes. Gratuit, sans clé, sans inscription. Client dans `lib/apple-podcasts.ts`, boutique FR.
- Un podcast suivi est une ligne de `watched_sources` (plateforme `podcast`, `external_id` = identifiant Apple). Pas de nouvelle table ni de migration.
- Suivre un podcast crée son créateur (au nom du podcast, ou celui qui a déjà ce compte) et un compte `podcast` dans `creator_accounts` (ADR-0016). Ne plus suivre retire seulement la source : créateur, compte et codes restent.
- Seul l'identifiant Apple est accepté du navigateur : titre et liens sont relus côté serveur dans l'annuaire.
- Page admin `/admin/podcasts` (Modération).
- Lecture des épisodes (`lib/podcast-read.ts`) : chaque nuit à 3 h 30 UTC (`/api/cron/podcasts`, même `CRON_SECRET` que les retests) et à la demande depuis l'admin. Premier passage sur 45 jours, puis depuis la dernière lecture (marge de 7 jours). Les codes sont repérés sans IA (`lib/podcast-codes.ts` : « code », « coupon »… et un outil du catalogue sur la même ligne ou celle d'avant), ajoutés « En attente » et analysés aussitôt ; l'IA, quand elle est active, intervient dans cette analyse comme pour YouTube. Un code déjà connu pour l'outil n'est jamais recréé.
- Les vérifications savent relire un épisode Apple Podcasts (`podcastReader`), en plus des vidéos YouTube.

## Alternatives envisagées
- **Podcast Index** : très complet et ouvert, mais inscription impossible avec une adresse gratuite. Pourra remplacer Apple plus tard derrière la même interface `PodcastDirectory`.
- **Lire les flux RSS directement** : marche pour tous les podcasts, mais demande un analyseur XML (nouvelle dépendance) et ne permet pas de chercher un podcast par son nom.
- **Listen Notes / Spotify** : clé obligatoire et quotas gratuits serrés ; Spotify n'expose pas toujours les notes complètes.

## Conséquences
- Aucune clé à gérer pour les podcasts.
- Apple limite à une vingtaine d'appels par minute : suffisant pour l'admin et une lecture de nuit, à étaler si la liste dépasse quelques dizaines de podcasts.
- Un podcast absent d'Apple Podcasts ne peut pas être suivi pour l'instant.
- Un code pour un outil absent du catalogue n'est pas relevé : l'admin ajoute l'outil d'abord.
- Une deuxième tâche planifiée Vercel, une fois par jour.
- Les notes d'épisode d'Apple peuvent être plus courtes que celles du flux RSS ; si des codes manquent, on lira le `feedUrl` gardé dans `watched_sources`.
