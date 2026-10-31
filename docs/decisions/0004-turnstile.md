# ADR-0004 : Cloudflare Turnstile sur le formulaire de proposition

## Statut
Acceptée

## Date
2026-10-31

## Contexte
Le formulaire `/proposer` est public et écrit en base. La limite d'essais par IP (5 propositions par heure) ne suffit pas contre un robot qui change d'adresse. CLAUDE.md prévoit Turnstile et une limite de débit sur les formulaires publics.

## Décision
- Afficher le widget Cloudflare Turnstile sur `/proposer`, chargé depuis `challenges.cloudflare.com` en rendu explicite, sans dépendance npm.
- Vérifier le jeton côté serveur (`lib/turnstile.ts`, API siteverify) avant la limite d'essais et l'écriture en base.
- En production, sans `TURNSTILE_SECRET_KEY`, le formulaire répond 503 (fermé plutôt qu'ouvert). Si Cloudflare ne répond pas, la proposition est refusée.
- La CSP autorise `challenges.cloudflare.com` pour les scripts, les connexions et les iframes.

## Alternatives envisagées
- **hCaptcha / reCAPTCHA** : plus intrusifs pour le visiteur, reCAPTCHA envoie des données à Google. Écartés.
- **Paquet React pour Turnstile** : une dépendance de plus pour une vingtaine de lignes. Écarté.

## Conséquences
- Clés à définir sur Vercel : `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (lue au build) et `TURNSTILE_SECRET_KEY`. Les domaines du site doivent être déclarés dans le widget Cloudflare.
- En local sans clés, le widget n'apparaît pas et la vérification est sautée.
- Si Cloudflare est en panne, les propositions sont refusées pendant la panne.
