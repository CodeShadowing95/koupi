# ADR-0016 : Comptes des créateurs sur les réseaux

## Statut
Proposée

## Date
2026-11-02

## Contexte
La spec des vérifications assistées distingue trois niveaux de créateur : Repéré, Contrôlé par Koupi et Créateur vérifié. Jusqu'ici, tout créateur en base comptait comme « repéré », faute d'endroit où noter ses comptes, ses abonnés et les contrôles. Le plan de l'espace créateur prévoyait déjà une table `creator_accounts` à part, sans toucher aux codes.

## Décision
- Table `creator_accounts`, migration `0007_creator_accounts`, validée par Vastolorde. Un compte = un réseau (YouTube, TikTok, Instagram, Snapchat, Twitch, X, podcast, autre), avec l'identifiant stable du réseau (l'ID de chaîne YouTube ne change pas, le pseudo si), le pseudo, le lien, les abonnés et la date du relevé.
- Un compte n'appartient qu'à un créateur : unique sur (réseau, identifiant) et sur (réseau, pseudo sans casse).
- Colonnes du contrôle par Koupi : `platform_verified` (badge certifié du réseau, coché à la main) et `admin_checked_at` (date du contrôle par l'admin).
- Colonnes de la réclamation, remplies plus tard par l'espace créateur : `claim_status` (none, pending, verified, revoked), `claim_method` (oauth, bio_code, dm, manual), `claimed_at`, `last_rechecked_at`. Le journal des tentatives (`account_verifications`) viendra avec cet espace.
- Le niveau se calcule compte par compte puis on garde le meilleur (`lib/creator-level.ts`) : réclamé → Créateur vérifié ; badge certifié, ou contrôle de l'admin avec au moins 1000 abonnés sur ce compte → Contrôlé par Koupi ; sinon Repéré.
- L'analyse d'un code utilise ce niveau dans le score (+15 contrôlé, +20 vérifié).
- Supprimer un créateur supprime ses comptes (`on delete cascade`).

## Conséquences
- Une table de plus, vide au départ : tous les créateurs restent « repérés » tant que l'admin ne relie pas de compte.
- L'onglet Créateurs de l'admin et le badge du site s'appuieront sur cette table.
