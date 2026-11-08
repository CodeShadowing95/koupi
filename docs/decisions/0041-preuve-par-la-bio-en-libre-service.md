# ADR-0041 : Le créateur prouve son compte lui-même, avec son propre code

## Statut
Acceptée

## Date
2026-11-08

## Contexte
Depuis l'ADR-0020, la preuve par la bio passe par l'admin : il donne un code (stocké sur le compte, `creator_accounts.claim_code`), l'envoie par e-mail, lit la bio, puis donne l'accès à l'espace (ADR-0021). Un créateur pressé doit attendre deux fois l'admin.

Un code unique par compte pose aussi un problème en libre-service : deux personnes qui revendiquent le même compte se partageraient ou s'écraseraient le code. Un usurpateur pourrait ainsi bloquer le vrai créateur.

Le 8 novembre 2026, l'éditeur a décidé d'ouvrir l'espace créateur à tous. La rosette « Créateur vérifié » reste réservée aux comptes au-dessus du seuil d'audience (1 000 abonnés ou 50 notes, décision du 6 novembre).

## Décision
- Nouvelle table `creator_claim_codes` (migration 0032) : un code `MERKOD-XXXXXX` par créateur connecté et par compte (`unique(user_id, account_id)`), valable 14 jours. Elle note la dernière lecture (`checked_at`) et, pour les réseaux que Merkod ne lit pas, la date où le créateur dit l'avoir mis (`submitted_at`).
- Dans son espace, le créateur connecté avec une revendication ouverte voit les comptes reliés à cette page. Pour un compte, il peut :
  - **obtenir son code** ;
  - **le faire vérifier** sur YouTube : Merkod lit la description, ce qui coûte 1 unité du quota ;
  - dire **« C'est fait »** sur les autres réseaux : l'admin constate le code dans **Codes à constater** (page Demandes des créateurs).
- Code trouvé : le compte passe `claim_status = 'verified'` (comme par l'admin). Les codes des autres personnes sur ce compte sont effacés. Le créateur reçoit l'accès à son espace et sa revendication est marquée traitée.
- Garde-fous :
  - Seul un compte **contrôlé par l'admin** (`admin_checked_at`) peut être prouvé.
  - Seule une page que le créateur **revendique** est ouverte à la preuve.
  - Un compte déjà prouvé ou dont la preuve a été retirée est fermé.
  - La route `/api/creator-proof` est limitée à 20 essais par heure et par créateur, et suit l'interrupteur « Espace créateur ».
- Le seuil d'audience ne bloque plus l'accès à l'espace, ni en libre-service ni par l'admin (`grantCreatorAccess` demande un compte prouvé, quelle que soit son audience). Le niveau public reste calculé comme avant (`creatorLevelOf`) : sans le seuil, pas de rosette ni de coche bleue.
- Le parcours de l'admin (« Donner un code », ADR-0020) reste en place pour les créateurs qui ne se connectent pas.

## Alternatives envisagées
- **Réutiliser `creator_accounts.claim_code`** : aucune table de plus, mais deux revendications du même compte se gênent, et un usurpateur peut renouveler le code du vrai créateur.
- **Vérification par OAuth (connexion Google/TikTok)** : la preuve la plus forte, mais elle demande un domaine et la revue des applications par chaque réseau. Elle reste pour plus tard.

## Conséquences
- Un petit créateur prouve son compte et voit ses copies, mais n'est pas « Créateur vérifié » tant qu'il est sous le seuil.
- La suppression d'un compte créateur efface ses codes (clé étrangère `on delete cascade`).
- La page Confidentialité mentionne les codes de preuve et la lecture de la description publique.
