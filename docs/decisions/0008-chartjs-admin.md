# ADR-0008 : Chart.js pour les graphiques du back-office

## Statut
Proposée

## Date
2026-11-01

## Contexte
Le back-office reçoit une page Statistiques (état des codes, couverture par catégorie, propositions par semaine, fiabilité). L'admin n'est pas expert : il faut des graphiques lisibles, avec infobulles, en clair comme en sombre, sans alourdir le site public.

## Décision
Chart.js 4.5.1, importé seulement dans `components/admin-charts.tsx` et en n'enregistrant que les morceaux utilisés (barres, axes, infobulle). Les couleurs viennent des variables CSS du thème admin. Chaque graphique a une vue tableau. Aucune donnée ne part vers un service tiers.

## Alternatives envisagées
- **Recharts** : composants React agréables, mais plus lourd (d3 en dépendance).
- **SVG fait main** : zéro dépendance, mais infobulles, axes et accessibilité à refaire.

## Conséquences
Une dépendance de production en plus, chargée uniquement sur `/admin/stats` (le site public n'en hérite pas). Les mesures d'audience restent à faire avec des compteurs anonymes dans Neon, sans outil d'analyse tiers.
