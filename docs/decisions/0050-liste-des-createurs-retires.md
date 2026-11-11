# ADR-0050 : Liste des créateurs retirés

## Statut
Acceptée

## Date
2026-11-10

## Contexte
Le bouton « Supprimer » d'une fiche créateur (ADR-0048) efface tout ce qui concerne un créateur qui l'a demandé. Mais plusieurs chemins recréent un créateur tout seul à partir de son nom ou de sa chaîne : les chaînes et podcasts suivis, la recherche YouTube par catégorie, les compilations (ADR-0042), l'import des fichiers de `data/` à chaque déploiement, et les codes proposés par les visiteurs puis validés. Le créateur a demandé que rien ne soit publié à son nom sans son accord.

## Décision
Une table `removed_creators` (migration 0035) garde le strict minimum : nom, slug, identifiants de ses chaînes YouTube, identifiants de ses codes dans `data/`, date.

- La suppression d'un créateur l'y ajoute (avant d'effacer le reste).
- `resolveCreator` (le point par lequel passent toutes les sources) renvoie `null` pour un nom de la liste (slug, ou slug sans tirets : « LaMicroByFlo ») ou une chaîne de la liste ; chaque source saute alors le code. L'admin reçoit une erreur claire s'il tente d'ajouter un code à ce nom.
- L'import de `data/` saute ses codes et ne recrée pas sa page.
- Le créateur reste libre de s'inscrire : la preuve d'une chaîne par la bio (par lui ou par l'admin) le sort de la liste. L'admin peut aussi l'en sortir (Administration → Créateurs retirés), noté dans le journal.

## Alternatives envisagées
- **Suppression sans liste** : l'IA recréerait sa page à sa prochaine vidéo sponsorisée.
- **Garder la page masquée** au lieu de l'effacer : ne répond pas à une demande d'effacement.
- **Bloquer aussi l'inscription** : le créateur ne pourrait plus revenir de lui-même.

## Conséquences
- Une demande de retrait est respectée dans la durée, pas seulement le jour même.
- Merkod garde un nom et un identifiant de chaîne après l'effacement : c'est la donnée minimale pour respecter l'opposition (mentionnée sur la page Confidentialité).
- Un autre créateur qui porterait exactement le même nom ne serait pas créé automatiquement ; l'admin le voit à l'erreur et peut trancher.
