# ADR-0013 : Socle IA des vérifications avec le SDK Anthropic

## Statut
Proposée

## Date
2026-11-02

## Contexte
La spec « vérifications assistées par IA » prévoit qu'une IA lise les descriptions publiques (vidéos YouTube, épisodes de podcast) et relève les codes promo, pour que l'admin n'ait plus qu'à valider. Vastolorde veut poser le socle tout de suite, mais ne payer l'IA qu'au moment de l'activer.

## Décision
- Dépendance `@anthropic-ai/sdk` (validée par Vastolorde), utilisée seulement côté serveur dans `lib/ai-extract.ts`.
- Sans `ANTHROPIC_API_KEY`, l'IA est inactive : l'état « IA en attente d'activation » s'affiche et tout le reste marche (contrôles, score, file). Activer = acheter des crédits sur la console Anthropic, fixer une limite de dépense, ajouter la clé sur Vercel.
- Mode mixte, choisi par Vastolorde : un petit modèle lit tout (`AI_MODEL`, par défaut `claude-haiku-5-5`), un modèle puissant ne relit que les dossiers douteux (`AI_REVIEW_MODEL`, par défaut `claude-opus-5-5`) : première lecture refusée, aucun code trouvé alors que la description parle de promo, ou score entre 20 et 60 (`needsSecondReading`). L'admin pourra aussi demander une relecture. Effort `low`, sortie JSON imposée par un schéma, repli automatique côté serveur en cas de refus sur les modèles qui l'acceptent (pas Haiku).
- L'IA ne décide de rien : un code n'est gardé que s'il figure mot pour mot dans la description (contrôlé par notre code), et le score reste calculé par `lib/verification.ts`.
- La description est passée comme donnée entre balises, avec la consigne d'ignorer toute instruction qu'elle contient. Elle est coupée à 12 000 caractères.
- Plafond mensuel `AI_MONTHLY_BUDGET_EUR` (10 € par défaut), converti en dollars par `AI_USD_PER_EUR`. Le coût de chaque appel est calculé depuis les jetons et gardé dans `verification_checks` ; au plafond, l'analyse s'arrête jusqu'au mois suivant.
- Seuls des textes publics sont envoyés à l'IA, jamais une donnée de visiteur : la promesse « zéro pistage » tient.

## Alternatives envisagées
- **Appels HTTP sans SDK** : une dépendance de moins, mais il faudrait réécrire les types, les reprises et la gestion d'erreurs.
- **Un seul modèle** : Opus partout coûte environ 40 fois plus par lecture ; Haiku seul rate peut-être des cas difficiles. Le mode mixte garde le prix de Haiku pour la plupart des dossiers.
- **Un modèle différent selon le mois** : plus simple, mais on paie Opus même pour les descriptions faciles.

## Conséquences
- Une clé d'API de plus à protéger dans les réglages Vercel.
- Le tarif par modèle est écrit dans le code ; il faudra le mettre à jour si Anthropic change ses prix.
