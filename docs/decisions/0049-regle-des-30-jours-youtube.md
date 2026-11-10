# ADR-0049 : Règle des 30 jours de l'API YouTube

## Statut
Acceptée

## Date
2026-11-10

## Contexte
Les règles de l'API YouTube (YouTube API Services Developer Policies, III.E.4) interdisent de garder plus de 30 jours les données lues sans l'autorisation du propriétaire de la chaîne : elles doivent être actualisées ou effacées au plus tard 30 jours après leur lecture. Le nombre d'abonnés y est cité en exemple. Merkod garde les abonnés et les vues des chaînes (`creator_accounts`) et la photo des chaînes (`stored_images`, ADR-0027), mais ne les relisait que quand l'admin cliquait sur « Actualiser ».

## Décision
Une tâche planifiée Vercel, chaque lundi à 4 h 30 UTC (`/api/cron/youtube-refresh`) :
1. relit les abonnés et les mesures de toutes les chaînes YouTube (1 unité de quota par lot de 50) et un lot de podcasts ;
2. relit la photo de chaque créateur ;
3. efface les abonnés, les mesures et les photos YouTube de plus de 30 jours qui n'ont pas pu être relus (`lib/youtube-retention.ts`).

L'effacement se fait même si YouTube ne répond pas. Les pochettes et mesures Apple Podcasts ne sont pas concernées.

## Alternatives envisagées
- **Relire chaque nuit** : plus de quota et de téléchargements pour rien, une fois par semaine suffit à rester sous 30 jours.
- **Ne plus rien stocker** et lire YouTube à chaque visite : coûteux en quota, et le navigateur des visiteurs contacterait Google (ADR-0027).

## Conséquences
- Les chiffres et photos affichés ont toujours moins de 30 jours.
- Un créateur dont la chaîne n'est plus lisible perd ses abonnés (donc peut-être son niveau « Contrôlé par Merkod ») et sa photo au bout de 30 jours.
- Reste à revoir : les autres textes lus par l'API et gardés (titres de vidéos des sources, noms et @ des chaînes). Ils sont aussi utilisés comme preuve de la source d'un code ; la façon de les traiter est à décider.
