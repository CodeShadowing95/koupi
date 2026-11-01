# ADR-0007 : Logos des outils servis par Koupi

## Statut
Proposée

## Date
2026-11-01

## Contexte
Les coupons affichaient l'initiale du créateur. On veut le logo de l'outil (NordVPN, Qonto…), avec l'initiale en repli. L'API YouTube ne fournit pas de logo de marque : elle donne seulement l'avatar de la chaîne du créateur.

## Décision
- Un script, `npm run logos` (`scripts/fetch-logos.mjs`), télécharge une fois les logos dans `public/logos/` et écrit `lib/tool-logos.json` (chemin, couleur de fond, source).
- Ordre de recherche : Simple Icons (glyphe SVG en CC0 + couleur officielle de la marque), puis l'icône déclarée par le site officiel (apple-touch-icon, icon, /favicon.ico). Sans résultat, le site affiche l'initiale.
- Les fichiers sont commités et servis par Koupi. Le navigateur du visiteur ne contacte aucun service tiers.
- Les logos sont affichés avec `<img>`, donc un SVG récupéré ne peut pas exécuter de script.
- Affichage : un « sceau » rond avec le logo au centre et le nom de l'outil écrit en cercle, qui tourne lentement (GSAP, arrêté avec « réduire les animations »).

## Alternatives envisagées
- **Services de favicons ou de logos à la volée** (Google, DuckDuckGo, logo.dev) : rien à stocker, mais chaque visite envoie l'adresse IP du visiteur à un tiers, ce qui contredit la promesse « pas de suivi ». logo.dev demande aussi une clé.
- **Paquet npm `simple-icons` en dépendance** : il pèse plusieurs Mo pour une dizaine d'icônes utilisées. Le script lit le paquet ou le CDN seulement au moment de la récupération.
- **Colonne `logo` dans la base** : utile quand les outils seront en base. Ce sera un changement de schéma à valider plus tard ; pour l'instant, les outils sont dans `lib/data.ts`.

## Conséquences
- Il faut relancer `npm run logos` quand on ajoute un outil. Le script garde les logos déjà présents (`--force` pour tout refaire).
- Simple Icons ne couvre pas tous les outils. Pour les autres, le script doit pouvoir joindre le site officiel : il tourne en local, pas dans un environnement au réseau fermé.
- Les logos restent des marques : on les utilise seulement pour identifier l'outil, et la page Transparence le dit.
