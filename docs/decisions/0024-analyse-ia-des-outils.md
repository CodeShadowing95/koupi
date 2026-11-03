# ADR-0024 : Analyse par l'IA des outils à ajouter

## Statut
Proposée

## Date
2026-11-03

## Contexte
Les outils à ajouter (ADR-0023) arrivent avec un nom et un site devinés. Pour les ajouter, l'admin doit comprendre ce que fait l'outil et choisir sa catégorie. Le catalogue a peu de catégories : un sponsor de podcast (des compléments alimentaires, par exemple) n'entre souvent dans aucune.

## Décision
- Bouton **Analyser avec l'IA** sur chaque suggestion et dans le formulaire d'ajout. Koupi lit la **page d'accueil** du site (`lib/site-reader.ts`), puis le petit modèle (`AI_MODEL`, Haiku par défaut) rend un résumé, si c'est un outil en ligne, une catégorie existante ou le nom d'une nouvelle catégorie, et une justification (`lib/tool-analysis.ts`).
- L'IA propose, l'admin décide : l'analyse pré-remplit le formulaire, et rien n'est créé sans son clic. Une catégorie inventée par le modèle hors de la liste est écartée, et une « nouvelle » catégorie qui existe déjà sous ce nom est remplacée par celle-ci.
- Le formulaire permet aussi de créer une **nouvelle catégorie à la main** (« + Nouvelle catégorie »), créée avec l'outil. Cela fonctionne sans IA.
- Schéma : trois colonnes sur `tool_suggestions` (migration `0015_tool_suggestion_analysis`) : `analysis` (jsonb, la dernière analyse), `analysis_cost_usd_micros` (coût cumulé) et `analyzed_at`. `aiSpendSince` additionne ce coût à celui des vérifications : le **plafond mensuel** couvre les deux.
- Comme le reste de l'IA (ADR-0013), rien ne se passe sans `ANTHROPIC_API_KEY` : le bouton est grisé avec « IA en attente d'activation ».
- **Lecture du site, protégée** : l'adresse vient de notes de podcasts. On n'accepte que `https` sur le port par défaut et un vrai nom de domaine. Les adresses IP et les noms locaux sont refusés, et chaque nom est résolu pour refuser une adresse de réseau privé, à chaque redirection (trois au plus). La lecture dure 8 s au plus et s'arrête à 400 Ko. Seul le texte visible (sans scripts, menus ni pied de page), tronqué à 6 000 caractères, est envoyé au modèle, comme une donnée et jamais comme une consigne.

## Alternatives envisagées
- **Laisser le modèle naviguer lui-même** (outil de recherche web) : plus complet, mais plus cher et moins prévisible ; la page d'accueil suffit presque toujours pour situer un outil.
- **Garder l'analyse seulement dans le navigateur** : pas de changement de schéma, mais l'analyse serait payée à nouveau à chaque visite et son coût échapperait au plafond.
- **Créer la catégorie automatiquement** : rapide, mais multiplierait les catégories presque identiques ; l'admin garde la main sur le nom.

## Conséquences
- Une analyse coûte une fraction de centime avec Haiku ; elle est comptée dans le plafond du mois.
- Un site qui ne s'affiche qu'avec JavaScript donne une page vide : l'admin le voit et choisit à la main.
- La résolution du nom puis la lecture laissent une petite fenêtre (changement de DNS entre les deux) ; le risque reste faible car la page lue n'est jamais renvoyée telle quelle, seulement résumée.
