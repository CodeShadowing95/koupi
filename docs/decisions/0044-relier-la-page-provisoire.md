# ADR-0044 : Relier une page provisoire à la vraie page du créateur

## Statut
Acceptée

## Date
2026-11-08

## Contexte
Depuis l'ADR-0043, un créateur peut ouvrir son studio sur une page provisoire (« Passer cette étape »), sans revendiquer ni prouver de chaîne. Une page à son nom peut pourtant déjà exister sur Merkod : créée par l'admin, avec ses comptes et des codes trouvés dans ses vidéos. Le créateur se retrouve alors avec deux pages : la sienne, vide et non vérifiée, et la vraie, qu'il ne gère pas. L'ADR-0043 empêche seulement de reprendre exactement le même nom ou le même @.

## Décision
- **Fusion dans la vraie page**, choisie par Vastolorde. Quand le créateur prouve par sa bio un compte de la vraie page, sa page provisoire y est fusionnée. Ses codes, ses comptes, ses sources suivies et ses propositions passent sur la vraie page, et sa bio aussi si la vraie n'en a pas. Puis la page provisoire est effacée. La fusion se fait aussi quand l'admin donne l'accès à la vraie page. Une page qui a un compte prouvé n'est jamais fusionnée.
- **Dans le Studio**, un créateur à la page provisoire peut revendiquer une autre page, ce qu'il ne pouvait pas avant (ADR-0043). Si une page au nom proche existe avec au moins un compte, l'encart « Fais vérifier ta chaîne » lui propose « C'est moi, relier cette page ». Il doit ensuite prouver la vraie page par sa bio, comme tout le monde : le rapprochement de noms n'ouvre rien à lui seul.
- **Dans l'admin**, la section « Pages à relier » de Demandes créateurs liste ces rapprochements. L'admin envoie une invitation par e-mail d'un clic. Rien ne part automatiquement, et chaque envoi est noté au journal de l'Administration (action `creator_link_invite`, « e-mail · page »), ce qui affiche la date de la dernière invitation.
- Pas de transaction (pilote Neon HTTP) : tout est déplacé d'abord, la page provisoire s'efface en dernier. Un nouvel essai reprend là où ça s'est arrêté.
- Aucun changement de schéma.

## Alternatives envisagées
- **Garder les deux pages** : simple, mais les codes du créateur restent éparpillés et la page provisoire fait doublon.
- **Supprimer la page provisoire sans reprendre ses codes** : on perdrait ce qu'il a ajouté.
- **E-mail automatique dès qu'un nom ressemble** : écarté. Un rapprochement de noms peut se tromper, l'admin garde la main.

## Conséquences
- L'adresse de la page provisoire disparaît après la fusion. Elle n'était visible que si elle avait un code publié.
- Un même code peut se retrouver en double sur la vraie page, s'il y était déjà : l'admin l'archive.
- Le rapprochement est approximatif (nom, adresse ou @ qui se contiennent). C'est pour ça que la preuve par la bio reste obligatoire.
