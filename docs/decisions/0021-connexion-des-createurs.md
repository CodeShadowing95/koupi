# ADR-0021 : Connexion des créateurs par lien magique

## Statut
Proposée

## Date
2026-11-03

## Contexte
L'espace créateur demande que les créateurs se connectent. Le doc de conception a retenu la connexion par lien envoyé par e-mail (pas de mot de passe). Les créateurs viennent surtout de YouTube et sont pressés : la moindre friction les fait partir. Koupi n'a pas encore de nom de domaine, donc pas encore d'envoi d'e-mails en production.

## Décision
- Deux tables (migration `0011_creator_sign_in`) :
  - `creator_users` : un compte par e-mail (en minuscules), `creator_id` vide tant que l'admin n'a pas donné l'accès à une page.
  - `creator_sign_in_tokens` : seule l'empreinte SHA-256 du jeton (32 octets aléatoires) est gardée. Valable 20 minutes, une seule fois. Les liens expirés depuis plus d'un jour sont effacés.
- Le lien ouvre `/creator/sign-in`, qui envoie le jeton en POST : un antivirus de messagerie qui ouvre le lien sans JavaScript ne le consomme pas.
- Session : cookie `koupi_creator` httpOnly, `SameSite=Lax`, 30 jours, « id.expiration.signature » en HMAC-SHA256 avec `SESSION_SECRET`. La charge signée porte un préfixe `creator:` : un cookie créateur ne peut pas servir de cookie admin, et inversement.
- Se connecter ne donne accès à aucune page. L'admin donne l'accès depuis la revendication (`/admin/createurs/demandes`), et le serveur le refuse tant qu'aucun compte du créateur n'est prouvé par la bio (ADR-0020).
- Envoi par l'API HTTP de Resend avec `fetch`, sans nouvelle dépendance (`RESEND_API_KEY`, `EMAIL_FROM`). Sans eux : le lien s'affiche dans la console en local ; en production, la revendication est notée et la page dit que la connexion ouvre bientôt.
- L'adresse du lien vient de `NEXT_PUBLIC_APP_URL` en production, jamais de l'en-tête Host.
- Protections de la demande de lien : Turnstile, 5 demandes par heure et par IP, 3 par heure et par e-mail.
- Parcours pensé pour les gens pressés : sur `/for-creators?c=slug`, le créateur voit d'abord ses chiffres (copies du mois), puis un seul champ (l'e-mail). Après l'envoi, la page montre ce qui l'attend et permet de renvoyer le lien. Aucun procédé qui retient de force (pas de faux compte à rebours ni de fenêtre de sortie).

## Conséquences
- Il faut un domaine vérifié chez Resend pour ouvrir la connexion en production. Le code est prêt, il suffit des variables.
- Premières données personnelles de créateurs (e-mails) : la page Confidentialité le dit. Elles ne sortent pas de l'admin.
- L'espace créateur (`/creator`) est volontairement minimal : ses codes et leurs copies du mois. La suite (gérer ses codes, preuve par la bio en libre-service, alertes) viendra dans les PR suivantes.
