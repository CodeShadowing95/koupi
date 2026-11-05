# ADR-0034 : Lire chaque nuit les chaînes YouTube suivies

## Statut
Acceptée

## Date
2026-11-05

## Contexte
La recherche YouTube coûte 100 unités du quota (10 000 par jour) et ramène surtout des inconnus. Les créateurs qui ont déjà donné un code sont la meilleure source de nouveaux codes, mais rien ne relisait leurs vidéos. La table `watched_sources` suit déjà les podcasts chaque nuit et accepte la plateforme `youtube`.

## Décision
Une chaîne YouTube se suit avec une ligne `watched_sources` (plateforme `youtube`, identifiant de chaîne, créateur), sans changement de schéma. Côté admin : une case « Suivre ses vidéos » sur le compte YouTube d'un créateur, et un bouton « Suivre les chaînes » pour toutes les chaînes reliées des créateurs qui ont un code. Décocher met en pause sans supprimer.

Chaque nuit (`/api/cron/youtube-channels`, 4 h UTC, après les podcasts), `lib/youtube-channel-read.ts` lit pour chaque chaîne active :
1. la liste « Mises en ligne » (`playlistItems`, identifiant `UU…` déduit de `UC…`) : 1 unité ;
2. les descriptions des vidéos récentes jamais lues (`videos`) : 1 unité par lot de 50.

« Récente » : depuis la dernière lecture moins 2 jours, ou 45 jours la première fois. Les vidéos déjà lues (table `youtube_seen_videos`, ADR-0033) sont écartées. Un passage lit au plus 200 chaînes, les moins récemment lues d'abord. Les codes trouvés arrivent en attente avec l'origine `youtube_channel` (ADR-0032).

## Alternatives envisagées
- **Les flux RSS des chaînes** (gratuits, sans quota) : ils ne donnent que le début de la description, souvent sans le code.
- **`search` avec `channelId`** : 100 unités par chaîne, cent fois plus cher.
- **`channels.list` pour trouver la liste des vidéos** : 1 unité de plus par lot ; le préfixe `UU` est une convention stable de YouTube.

## Conséquences
- 100 chaînes suivies coûtent environ 100 à 110 unités par nuit, moins qu'une recherche.
- Un créateur repéré une fois est relu sans effort : ses nouveaux codes arrivent tout seuls dans Vérifications.
- La future page Sources affichera les chaînes suivies à côté des podcasts.
