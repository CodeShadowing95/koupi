# ADR-0023 : Outils à ajouter, depuis les codes lus dans les podcasts

## Statut
Proposée

## Date
2026-11-03

## Contexte
La lecture des podcasts (ADR-0017) ne garde que les codes d'outils déjà au catalogue. Or beaucoup de sponsors de podcasts sont des outils que Merkod ne suit pas encore : sur Génération Do It Yourself, « code GDIY sur gradium.ai » ou « Cuure : cuure.com (code DOIT) » étaient perdus. L'admin doit pouvoir les voir, ajouter l'outil en un clic et envoyer le code dans Vérifications, sans IA.

## Décision
- Nouvelle table **`tool_suggestions`** (migration `0014_tool_suggestions`) : nom deviné, domaine (si un lien est cité), code, réduction, extrait des notes, épisode (lien et titre), podcast et créateur, état `open` / `added` / `ignored`, outil et code créés.
- Index unique sur (domaine ou nom, code) en minuscules : une même suggestion n'est jamais recréée, même après avoir été ignorée.
- Le repérage reste sans IA (`scanPromoCodes` dans `lib/podcast-codes.ts`) : quand aucun outil du catalogue n'est près du code, on devine l'outil par le domaine du lien voisin (raccourcisseurs, réseaux et hébergeurs exclus), sinon par le nom qui ouvre la ligne (« Cuure : … », trois mots au plus).
- Page `/admin/podcasts`, onglet « Outils à ajouter » : l'admin crée l'outil (nom, catégorie, site pré-remplis) ou relie la suggestion à un outil déjà au catalogue, ou l'ignore. Ajouter l'outil crée en attente les codes de toutes les suggestions ouvertes du même site (ou du même nom sans site) et prépare leur dossier de vérification (`lib/tool-suggestions.ts`, `POST /api/admin/tool-suggestions/[id]`).
- Rien n'est publié automatiquement : l'outil reste hors du site tant qu'il n'a pas de code vérifié ou à tester.

## Alternatives envisagées
- **Créer l'outil automatiquement** : rapide, mais le nom deviné et le site sont parfois faux (lien de suivi, nom d'émission). L'admin garde la main.
- **Garder ces codes dans `codes` sans outil** : demanderait de rendre `tool_id` facultatif partout (site, exports, vérifications). Une table à part reste isolée.
- **Faire deviner l'outil par l'IA** : plus juste, mais l'IA n'est pas encore active ; elle pourra enrichir ces suggestions plus tard sans changer la table.

## Conséquences
- Une table et une migration de plus, sans effet sur le site public.
- Les suggestions ignorées restent en base pour ne pas revenir ; elles sont petites et peu nombreuses.
- Si un sponsor ne cite ni lien ni « Nom : », le code reste invisible : l'admin peut toujours l'ajouter à la main.
