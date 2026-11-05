# ADR-0033 : Recherche YouTube sans doublon, à formulations variées

## Statut
Acceptée

## Date
2026-11-05

## Contexte
La recherche de codes sur YouTube (page Catégories, panneau d'un outil) lançait toujours la même requête « <outil> code promo » sur les vidéos de l'année, avec 8 résultats. Relancée, elle rendait presque les mêmes vidéos : 100 unités du quota (sur 10 000 par jour) pour relire ce qu'on avait déjà lu. Rien ne gardait la trace des vidéos lues ni des chaînes déjà rencontrées.

## Décision
Deux tables :
- `youtube_seen_videos` : chaque vidéo lue (identifiant, chaîne, outil cherché, requête, codes trouvés, date). Une vidéo déjà lue est écartée avant de demander sa description.
- `youtube_searches` : chaque recherche lancée (outil ou catégorie, formulation, requête, vidéos rendues, vidéos neuves, codes trouvés, date).

Les formulations tournent (`lib/youtube-queries.ts`) : « code promo », « code réduction », « promo code », « discount code ». Une formulation jamais essayée pour cet outil cherche sur l'année ; quand toutes l'ont été, on reprend la plus ancienne en ne demandant que les vidéos publiées depuis sa dernière utilisation. La langue reste le français (`relevanceLanguage=fr`).

Une recherche coûte 100 unités quel que soit le nombre de résultats (jusqu'à 50) : on en demande 20 au lieu de 8. La lecture des descriptions reste à 1 unité par lot de 50.

Une chaîne est « connue » si un créateur a ce compte YouTube ou si une de ses vidéos a déjà été lue. Le compte rendu donne les nouvelles chaînes, les connues et les vidéos écartées.

## Alternatives envisagées
- **Garder les vidéos lues dans le journal des codes** : on ne garderait que celles qui ont donné un code, et on relirait toutes les autres.
- **Une colonne « dernière recherche » sur les outils** : plus simple, mais ne dit pas quelle formulation a servi, et la future page Sources a besoin de l'historique des recherches.
- **Demander 50 résultats** : même coût, mais plus de descriptions à lire par l'IA quand elle est active ; 20 est un compromis.

## Conséquences
- Chaque clic sur « Chercher des codes » ramène des vidéos neuves, pour le même quota.
- La table des recherches servira à la page Sources et aux statistiques par source (rendement de la recherche YouTube).
- La table des vidéos lues grandit d'environ 20 lignes par recherche : quelques milliers par an, sans souci pour Postgres.
