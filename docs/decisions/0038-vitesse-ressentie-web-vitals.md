# ADR-0038 : Vitesse ressentie mesurée chez les visiteurs, comptée dans Neon

## Statut
Acceptée

## Date
2026-11-06

## Contexte
Les tests en local ou avec Lighthouse ne disent pas ce que vivent les vrais visiteurs, surtout sur des téléphones lents. Google juge une page sur ses Core Web Vitals (LCP, INP, CLS) au 75e centile des visites. Le site promet « zéro pistage » : pas de cookie, pas de service tiers d'analyse, comme pour les compteurs anonymes des copies et des votes.

## Décision
- Le site public envoie chaque mesure Web Vitals (`useReportWebVitals` de Next, déjà inclus) à `POST /api/vitals` avec `navigator.sendBeacon`.
- Le serveur ne garde que des compteurs : une nouvelle table `web_vitals` (jour, groupe de page, mesure, appareil, note `good` / `needs-improvement` / `poor`, nombre). Ni l'adresse exacte, ni le navigateur, ni l'IP ; l'IP hachée sert seulement à la limite de débit (300 envois par heure).
- Le groupe de page (accueil, codes, outil, créateur, créateurs, catégorie, autre) et l'appareil (téléphone si écran ≤ 760 px ou pointeur grossier) sont calculés et validés côté serveur avec des listes fermées.
- L'admin lit, dans l'onglet **Vitesse** de Statistiques, la part de bonnes visites sur 28 jours. Une page est rapide si au moins 75 % sont bonnes sur LCP, INP et CLS, lente si plus de 25 % sont mauvaises ; sous 20 mesures, pas de verdict.

## Alternatives envisagées
- **Vercel Speed Insights** : prêt à l'emploi, mais nouvelle dépendance, données chez un tiers, mention à ajouter à la page Confidentialité. Écarté pour garder la promesse de zéro service tiers.
- **Ne rien mesurer** : aucun coût, mais on optimiserait à l'aveugle.
- **Garder chaque mesure brute** : permettrait de vrais centiles, mais une ligne par visite grossit vite et ressemble à du pistage. Les notes de Google (bon / moyen / mauvais) suffisent pour appliquer la règle des 75 %.

## Conséquences
- Une table et une route de plus ; une écriture en base par mesure (environ 3 à 5 par page vue), absorbée par l'upsert sur la clé composée.
- Pas de centile exact (pas de « LCP p75 = 2,1 s »), seulement la répartition par note.
- La page Confidentialité mentionne la mesure.
