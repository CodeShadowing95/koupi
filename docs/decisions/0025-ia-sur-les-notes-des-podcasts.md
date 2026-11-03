# ADR-0025 : Lecture des notes de podcast par l'IA

## Statut
Proposée

## Date
2026-11-03

## Contexte
Les codes des podcasts sont repérés sans IA (ADR-0017, ADR-0023) : un code annoncé par « code » ou « coupon », et un outil sur la même ligne ou celle d'avant. Ce repérage rate les codes mal formulés, prend souvent « Voir l'épisode » comme réduction, ne lit pas la date de fin, et rattache parfois un code au mauvais outil quand deux sponsors partagent une ligne. L'IA de Koupi (ADR-0013) sait déjà lire une description de vidéo ou d'épisode.

## Décision
- Quand l'IA est active et sous le plafond, elle lit aussi les notes de chaque **nouvel épisode** qui parle d'une offre (« code », « promo », « -20 % »…), avec le petit modèle (`AI_MODEL`, Haiku par défaut), via `extractCodes`.
- Ses codes complètent le repérage sans IA (`lib/podcast-ai.ts`, `mergeAiCodes`) :
  - un code déjà repéré prend la réduction de l'IA si la sienne manquait, et sa date de fin ;
  - si l'IA rattache un code à un autre outil, c'est elle qu'on suit ;
  - un code nouveau est relié à l'outil du catalogue nommé par l'IA (ou dont le site est cité près du code), sinon il devient un outil à ajouter.
- Seuls les codes écrits mot pour mot dans les notes sont gardés (`keepVerbatimCodes`). Rien n'est publié : tout arrive « En attente » dans Vérifications.
- Un épisode déjà lu lors d'une lecture précédente (marge de 7 jours) n'est pas relu par l'IA, pour ne pas payer deux fois.
- Nouvelle table **`ai_usage`** (migration `0016_ai_usage`) : un appel à l'IA non rattaché à un code (objet, modèle, coût, épisode lu). `aiSpendSince` l'additionne aux autres dépenses, donc le plafond mensuel couvre aussi ces lectures.

## Alternatives envisagées
- **Remplacer le repérage sans IA par l'IA** : plus simple, mais tout s'arrêterait sans clé ou au plafond. Les deux se complètent.
- **Compter le coût sur les codes trouvés** : un épisode lu sans code trouvé coûterait sans laisser de trace. Une table dédiée garde tout.
- **Transcrire l'audio** : écarté par l'admin. Koupi ne lit que les notes écrites.

## Conséquences
- Une lecture coûte une fraction de centime avec Haiku. Une dizaine de podcasts hebdomadaires restent très loin du plafond de 10 €.
- La vérification de chaque code relit encore l'épisode (ADR-0013) : c'est une deuxième lecture indépendante, voulue.
