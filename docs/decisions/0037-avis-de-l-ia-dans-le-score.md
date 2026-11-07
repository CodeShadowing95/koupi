# ADR-0037 : L'avis de l'IA retire des points au score

## Statut
Acceptée

## Date
2026-11-06

## Contexte
L'ADR-0013 laissait le score entièrement calculé par nos contrôles : l'IA ne faisait qu'écarter les codes qu'elle inventait. Les tests avec les vraies clés (audit de l'admin, 6 novembre) ont montré l'effet pervers : « 2026 », une année lue dans « promo code 2026 », était noté 90/100 « Dossier clair » alors qu'Opus, en relisant la vidéo, ne le voyait pas comme un code. L'avis de l'IA valait 0 point et ne changeait rien.

## Décision
- Quand l'IA lit la source et n'y voit pas le code, le dossier perd 20 points (`AI_MISS_POINTS`). Elle ne peut jamais en ajouter : un code ne devient pas clair parce que l'IA l'a vu.
- Mise à jour 2026-11-07 : le dossier perd au moins assez de points pour passer sous `CLEAR_SCORE` (« À regarder de près »). Un code à 90 qui n'aurait perdu que 20 points restait « clair » alors que l'IA le contredisait (« Cowork13 », lu dans un sommaire).
- Un code qui n'est qu'un nombre, ou qui a la forme d'une clé de licence (blocs séparés par « / » ou « - »), perd 50 points (`implausibleCode`). Ces codes sont aussi écartés dès le repérage, avec ou sans IA.
- Les 30 points de départ s'affichent comme une ligne du détail, pour que la somme tombe juste.
- La décision reste à l'admin, comme avant.

## Alternatives envisagées
- **Rejeter d'office ce que l'IA ne voit pas** : trop sévère, Haiku rate parfois un code bien réel ; on préfère faire passer le dossier en « À regarder ».
- **Laisser l'IA noter le dossier** : score moins prévisible et plus difficile à expliquer.

## Conséquences
Un dossier n'est plus clair si le repérage et l'IA ne sont pas d'accord. Sans IA, rien ne change hormis le filtre des nombres et des clés de licence.
