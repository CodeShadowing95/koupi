# ADR-0020 : Preuve par la bio des comptes créateurs

## Statut
Proposée

## Date
2026-11-03

## Contexte
Le niveau « Créateur vérifié » (ADR-0016) suppose que le créateur prouve lui-même qu'un compte est le sien. Les colonnes `claim_status`, `claim_method` et `claimed_at` existaient mais rien ne les remplissait. Depuis ADR-0019, des créateurs peuvent revendiquer leur page : il faut un moyen de vérifier, sans attendre la connexion des créateurs (qui demande un nom de domaine pour envoyer des e-mails).

## Décision
- Preuve par un code placé dans la bio du compte : seul son propriétaire peut la modifier. Méthode `bio_code`.
- Deux colonnes sur `creator_accounts` (migration `0010_creator_claim_code`) : `claim_code` (`MERKOD-` + 6 caractères sans 0/O/1/I/L, `KOUPI-` avant le changement de nom) et `claim_code_at`. Un code n'existe en base que pendant une preuve en cours (`claim_status = 'pending'`), contrainte à l'appui. Il est effacé une fois la preuve faite ou annulée.
- Le code est valable 14 jours. L'admin le donne au créateur (message prêt à copier) : Merkod n'envoie pas d'e-mail lui-même pour l'instant.
- YouTube : Merkod lit la description de la chaîne par l'API officielle, avec l'ID stable de la chaîne (1 unité de quota par lecture, seulement quand l'admin clique). Autres réseaux, sans API ouverte : l'admin regarde la bio et confirme.
- Preuve faite : `claim_status = 'verified'`, le créateur passe « Créateur vérifié » et le compte porte une coche bleue sur sa page publique. L'admin peut retirer la preuve (`revoked`).
- Toutes les étapes passent par `POST /api/admin/creator-accounts/[id]/claim`, réservé à l'admin.

## Conséquences
- Deux colonnes de plus, vides au départ. Aucun créateur ne change de niveau tant que l'admin n'a rien fait.
- La preuve ne vaut que pour le compte relié à la fiche : l'admin doit avoir contrôlé ce compte, sinon un imposteur pourrait prouver un faux compte. Depuis le 3 novembre 2026, le serveur refuse de donner, lire ou confirmer un code sur un compte non contrôlé (`admin_checked_at` vide).
- Le journal des tentatives (`account_verifications`) et la preuve faite par le créateur depuis son espace viendront avec la connexion des créateurs.
- Changement de nom (4 novembre 2026, migration `0022`) : les nouveaux codes commencent par `MERKOD-`. La contrainte accepte encore `KOUPI-` pour qu'un créateur qui a déjà mis son code dans sa bio puisse finir sa preuve. Ces anciens codes expirent d'eux-mêmes au bout de 14 jours ; la contrainte pourra alors ne garder que `MERKOD-`.
- Seuil d'audience (6 novembre 2026) : la preuve ne vaut que sur un compte « Contrôlé par Merkod », c'est-à-dire avec le badge du réseau, ou contrôlé par l'admin avec au moins 1 000 abonnés (50 notes Apple pour un podcast). Avant, un compte contrôlé mais sous le seuil pouvait devenir « Créateur vérifié » sans jamais avoir été « Contrôlé par Merkod ». Le serveur refuse maintenant de donner, lire ou confirmer un code sur un tel compte. Le niveau « Créateur vérifié » demande la preuve et le niveau contrôlé (`creatorLevelOf`), sur tous les réseaux. Une preuve déjà faite sur un petit compte reste en base mais ne compte plus, et « Donner l'accès à son espace » attend un compte de ce niveau. Aucune migration.
