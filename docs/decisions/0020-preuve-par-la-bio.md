# ADR-0020 : Preuve par la bio des comptes créateurs

## Statut
Proposée

## Date
2026-11-03

## Contexte
Le niveau « Créateur vérifié » (ADR-0016) suppose que le créateur prouve lui-même qu'un compte est le sien. Les colonnes `claim_status`, `claim_method` et `claimed_at` existaient mais rien ne les remplissait. Depuis ADR-0019, des créateurs peuvent revendiquer leur page : il faut un moyen de vérifier, sans attendre la connexion des créateurs (qui demande un nom de domaine pour envoyer des e-mails).

## Décision
- Preuve par un code placé dans la bio du compte : seul son propriétaire peut la modifier. Méthode `bio_code`.
- Deux colonnes sur `creator_accounts` (migration `0010_creator_claim_code`) : `claim_code` (`KOUPI-` + 6 caractères sans 0/O/1/I/L) et `claim_code_at`. Un code n'existe en base que pendant une preuve en cours (`claim_status = 'pending'`), contrainte à l'appui. Il est effacé une fois la preuve faite ou annulée.
- Le code est valable 14 jours. L'admin le donne au créateur (message prêt à copier) : Merkod n'envoie pas d'e-mail lui-même pour l'instant.
- YouTube : Merkod lit la description de la chaîne par l'API officielle, avec l'ID stable de la chaîne (1 unité de quota par lecture, seulement quand l'admin clique). Autres réseaux, sans API ouverte : l'admin regarde la bio et confirme.
- Preuve faite : `claim_status = 'verified'`, le créateur passe « Créateur vérifié » et le compte porte une coche bleue sur sa page publique. L'admin peut retirer la preuve (`revoked`).
- Toutes les étapes passent par `POST /api/admin/creator-accounts/[id]/claim`, réservé à l'admin.

## Conséquences
- Deux colonnes de plus, vides au départ. Aucun créateur ne change de niveau tant que l'admin n'a rien fait.
- La preuve ne vaut que pour le compte relié à la fiche : l'admin doit avoir contrôlé ce compte, sinon un imposteur pourrait prouver un faux compte. Depuis le 3 novembre 2026, le serveur refuse de donner, lire ou confirmer un code sur un compte non contrôlé (`admin_checked_at` vide).
- Le journal des tentatives (`account_verifications`) et la preuve faite par le créateur depuis son espace viendront avec la connexion des créateurs.
