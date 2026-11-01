# ADR-0007 : Logos des outils servis par Koupi

## Statut
Proposée

## Date
2026-11-01

## Contexte
Les coupons affichaient l'initiale du créateur. On veut le logo de l'outil (NordVPN, Qonto…), avec l'initiale en repli. L'API YouTube ne fournit pas de logo de marque : elle donne seulement l'avatar de la chaîne du créateur.

## Décision
- Un script, `npm run logos` (`scripts/fetch-logos.mjs`), télécharge une fois les logos dans `public/logos/` et écrit `lib/tool-logos.json` (chemin, couleur de fond, source).
- Ordre de recherche : Logo.dev quand la clé `LOGO_DEV_TOKEN` est définie (clé publishable, dans `.env.local`, jamais dans le dépôt), puis Simple Icons (glyphe SVG en CC0 + couleur officielle de la marque), puis l'icône déclarée par le site officiel (apple-touch-icon, icon, /favicon.ico). Sans résultat, le site affiche l'initiale.
- Logo.dev autorise sur tous ses plans à stocker les logos et à les servir soi-même. Son plan gratuit demande un lien « Logos provided by Logo.dev » : le pied de page l'affiche dès qu'un logo vient de Logo.dev.
- Les fichiers sont commités et servis par Koupi. Le navigateur du visiteur ne contacte aucun service tiers.
- Les logos sont affichés avec `<img>`, donc un SVG récupéré ne peut pas exécuter de script.
- Affichage : un « sceau » rond avec le logo au centre et le nom de l'outil écrit en cercle, qui tourne lentement (GSAP, arrêté avec « réduire les animations »).

## Alternatives envisagées
- **Afficher les logos à la volée** (`img.logo.dev`, Google, DuckDuckGo) : rien à stocker, mais chaque visite envoie l'adresse IP du visiteur à un tiers, ce qui contredit la promesse « pas de suivi », et il faudrait ouvrir la CSP. On garde Logo.dev, mais seulement dans le script.
- **Paquet npm `simple-icons` en dépendance** : il pèse plusieurs Mo pour une dizaine d'icônes utilisées. Le script lit le paquet ou le CDN seulement au moment de la récupération.
- **Colonne `logo` dans la base** : utile quand les outils seront en base. Ce sera un changement de schéma à valider plus tard ; pour l'instant, les outils sont dans `lib/catalog.json` (généré par `npm run catalog`).

## Conséquences
- Il faut relancer `npm run logos` quand on ajoute un outil. Le script garde les logos déjà présents (`--force` pour tout refaire).
- Simple Icons ne couvre pas tous les outils. Pour les autres, le script doit pouvoir joindre le site officiel : il tourne en local, pas dans un environnement au réseau fermé.
- Les logos restent des marques : on les utilise seulement pour identifier l'outil, et la page Transparence le dit.
