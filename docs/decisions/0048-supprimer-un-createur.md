# ADR-0048 : Supprimer un créateur à sa demande

## Statut
Acceptée

## Date
2026-11-10

## Contexte
Les pages créateur sont créées à partir de données publiques (vidéos YouTube, notes d'épisode), sans demander l'avis du créateur. Un créateur a demandé que sa page, sa page Black Friday et son image story soient supprimées, et que rien ne soit publié à son nom sans son accord. Jusqu'ici, rien ne s'efface : un code s'archive (ADR-0009) et sa page disparaît du site, mais ses données restent en base.

## Décision
Un bouton **Supprimer** dans la fiche du créateur (admin seulement, confirmé en tapant son nom) efface pour de bon le créateur et tout ce qui le concerne : ses codes, leur journal et leurs vérifications, les propositions des visiteurs qui ont donné ses codes, les outils à ajouter trouvés dans ses sources, les chaînes suivies pour lui, ses comptes reliés, ses demandes, sa photo et son accès au studio. L'action est notée dans le journal de l'Administration (`creator_delete`).

Les outils restent : ils appartiennent aux marques et d'autres créateurs peuvent y avoir des codes.

Pas de transaction (pilote Neon HTTP) : les lignes liées s'effacent d'abord, le créateur en dernier, un nouvel essai reprend là où ça s'est arrêté.

## Alternatives envisagées
- **Archiver ses codes** : la page disparaît, mais ses données restent. Ne répond pas à une demande d'effacement.
- **Un lien public « Retirer ma page »** : écarté pour l'instant ; le créateur écrit à Merkod et l'admin supprime.

## Conséquences
- Une demande d'effacement se traite en une minute, sans toucher à la base à la main.
- Un code supprimé n'est plus protégé contre l'import des fichiers de `data/` : si le code y figure, il faut l'en retirer dans la même foulée (sinon `npm run db:import` le recrée au prochain déploiement). L'IA et les sources pourraient aussi recréer le créateur s'il republie un code ; une liste des créateurs retirés, qui bloquerait ce retour, est à décider (changement de schéma).
