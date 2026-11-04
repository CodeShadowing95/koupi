# ADR-0019 : Revendications et signalements des pages créateurs

## Statut
Proposée

## Date
2026-11-03

## Contexte
Merkod crée les pages des créateurs sans leur demander (modèle de la revendication, doc de conception de l'espace créateur). Il faut donc qu'un créateur puisse dire « c'est moi » et que n'importe qui puisse signaler une erreur sur une page, avant même que les comptes créateurs (connexion par lien magique) existent.

## Décision
- Nouvelle table `creator_requests` (migration `0009_creator_requests`) : créateur visé (suppression en cascade), type (`claim` ou `report`), e-mail, lien du compte, message, statut (`new`, `done`, `dismissed`), note de l'admin, empreinte de l'IP, dates de création et de traitement.
- Contraintes en base : une revendication a toujours un e-mail et un lien de compte en `http(s)`, un signalement a toujours un message ; longueurs bornées.
- Formulaire public sur la page créateur (`POST /api/creator-requests`), protégé comme les autres formulaires publics : Turnstile et 5 demandes par heure par IP (empreinte salée, jamais l'IP en clair). L'empreinte n'est jamais renvoyée à l'admin.
- Les demandes se traitent dans `/admin/createurs/demandes`. Le nombre de demandes à traiter apparaît dans « À faire » sur l'accueil de l'admin.
- Une revendication ne change rien automatiquement : ni niveau, ni accès. La preuve (code dans la bio) viendra avec l'espace créateur.
- Les liens disparaissent quand le créateur est déjà vérifié.

## Conséquences
- Une table de plus, vide au départ. Les e-mails laissés sont des données personnelles : ils ne sortent pas de l'admin et ne figurent dans aucun export.
- Les réponses se font à la main par e-mail tant que Merkod n'envoie pas d'e-mails.
