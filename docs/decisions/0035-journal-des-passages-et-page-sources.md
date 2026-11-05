# ADR-0035 : Journal des passages et page Sources

## Statut
Acceptée

## Date
2026-11-05

## Contexte
Les codes arrivent par plusieurs sources : recherche YouTube (à la main), chaînes YouTube et podcasts suivis (chaque nuit), propositions des visiteurs, ajouts à la main. L'origine de chaque code est connue (ADR-0032), mais rien ne gardait la trace des passages eux-mêmes : une tâche de nuit qui échoue ne laissait qu'une ligne dans les journaux de Vercel, et l'admin ne pouvait pas comparer ce que coûte et rapporte chaque source.

## Décision
Une table `source_runs` note chaque passage d'une source qui lit quelque chose : source (`youtube_search`, `youtube_channel`, `podcast`), déclencheur (`manual` ou `cron`), portée lisible (« Catégorie VPN », « Tous les podcasts suivis »…), état (`ok`, `partial` si une partie n'a pas répondu, `failed`), éléments lus, codes trouvés, codes hors catalogue, unités du quota YouTube, erreur, début et fin.

`recordRun` (`lib/source-runs.ts`) enveloppe le travail des routes existantes sans changer leur réponse : un passage qui n'a rien lu n'est pas noté, une erreur est notée puis relancée, et un échec d'écriture du journal ne casse jamais le passage.

La page `/admin/sources` montre une carte par source : rendement d'après l'origine des codes (trouvés, publiés, en attente, copiés ce mois-ci), dernier et prochain passage, coût du mois (unités YouTube et IA), bouton pour lancer qui annonce le coût, et le journal des 40 derniers passages. Les heures de nuit sont dans `lib/sources.ts`, vérifiées contre `vercel.json` par un test.

## Alternatives envisagées
- **Déduire les passages des codes trouvés** : un passage sans code ou en échec resterait invisible.
- **Réutiliser `youtube_searches`** : elle ne couvre que la recherche, une ligne par requête et pas par passage.

## Conséquences
- Une tâche de nuit en panne se voit dans l'admin, sans ouvrir Vercel.
- Les futures sources (IA web, Spotify, Podcast Index) ajoutent une valeur à `source` et une carte.
- La table grossit d'environ trois lignes par jour : pas de purge pour l'instant.
