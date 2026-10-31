# Cahier des charges : Koupi V0

Tu vas construire la V0 de **Koupi**, une application web en français. Lis tout ce document avant d'écrire du code. Le design visuel (couleurs, typographie, mise en page) est libre : choisis-le toi-même. En revanche, les fonctionnalités, les pages, le modèle de données, les règles de calcul et les contraintes ci-dessous sont obligatoires.

---

## 1. Le produit en bref

Koupi réunit au même endroit les codes promo que les créateurs de contenu (YouTube, podcasts, Instagram, TikTok…) donnent pour des **outils en ligne** : hébergement web, VPN, outils d'IA, logiciels pour freelances, outils de création, formation, etc.

Le parcours principal : le visiteur tape le nom d'un outil (par exemple « Hostinger »), voit les codes disponibles, de quel créateur ils viennent, s'ils marchent encore, copie le code en un clic et part sur le site de l'outil. Ensuite, il dit si le code a marché.

Slogan : **« Le code du créateur, vérifié. »**

### Notre promesse : 100 % pro-créateurs

C'est la règle la plus importante du produit. Elle doit se voir partout.

- On garde **toujours** le code du créateur, tel quel. On ne le remplace **jamais** par un code ou un lien à nous.
- Chaque code est **crédité** à son créateur, avec un lien vers la vidéo (ou le post) d'où il vient.
- Si le créateur a son propre lien (lien affilié du créateur), c'est **son** lien qu'on ouvre. Sinon on ouvre le site officiel de l'outil. Koupi n'ajoute aucun lien affilié, aucun paramètre de suivi, aucune redirection par un domaine à nous.
- Pas de publicité, pas de faux boutons, pas de pop-up, pas de code « révélé » derrière un clic trompeur. Le site doit inspirer confiance, à l'opposé des sites de coupons classiques.

### Ton de voix

- Tout le site est en **français**, en **tutoiement**.
- Ton chaleureux, direct, honnête. Phrases courtes. Pas de jargon marketing, pas de « MEGA PROMO ».
- Exemples : « Copie le code et ouvre le site », « Ça a marché ? », « Merci, ton vote aide les autres », « Aucun code pour l'instant. Préviens-moi dès qu'il en sort un ».

### Logo (imposé)

Le design est libre, mais le logo est imposé. Je te joins ces fichiers, à placer dans `public/brand/` :

- `koupi-logo.png` : logo complet sur fond transparent, pour fond clair (en-tête du site, e-mails) ;
- `koupi-logo-fond-sombre.png` : la même version pour fond sombre ;
- `koupi-logo-fond-blanc.png` : version sur fond blanc (images de partage, e-mails) ;
- `koupi-symbole.svg` et `koupi-symbole-512.png` : le symbole seul (le jeton rond qui remplace le « o ») ;
- `koupi-icone-512.png` : icône carrée (apple-touch-icon, manifeste web) ;
- `favicon.svg`, `favicon-32.png`, `favicon-192.png` : favicons.

Le logo est le mot « Koupi » où le « o » est un jeton rond bleu (#2A3BD6) avec deux encoches sur les côtés et une ligne de découpe en pointillés. Ne le redessine pas, ne change pas ses couleurs, ne le déforme pas. Tu peux reprendre le bleu #2A3BD6 comme couleur principale si ça convient à ton design. Le texte alternatif du logo est « Koupi ».

---

## 2. Périmètre de la V0

**Ce qu'on construit :**

- Site web uniquement (pas d'application mobile). Il doit rester utilisable sur téléphone (mise en page responsive), mais on optimise d'abord pour l'ordinateur.
- **Aucun compte utilisateur.** Pas d'inscription, pas de connexion pour le public.
- Les créateurs suivis (« le trousseau ») sont gardés dans le navigateur (localStorage).
- Les alertes passent uniquement par e-mail, avec double confirmation.
- Un back-office privé, protégé par un mot de passe unique, pour l'administrateur.

**Hors périmètre V0 (ne pas construire) :**

- Comptes utilisateurs, espace créateur, tableau de bord pour les marques.
- Extension de navigateur qui modifie un panier.
- Lecture des transcriptions vidéo, scraping de réseaux sociaux.
- Appels à l'API YouTube ou à une IA depuis l'application.
- Proposition d'un code par capture d'écran.
- Publicité sous toutes ses formes.
- Mode sombre (optionnel : seulement si c'est gratuit avec ton design).

---

## 3. Stack technique imposée

| Besoin | Choix |
| --- | --- |
| Framework | **Next.js (App Router) + TypeScript** strict |
| Style | Tailwind CSS (bibliothèque de composants au choix, accessible au clavier) |
| Base de données | **Postgres sur Neon** (pas Supabase, pas SQLite, pas Firebase) |
| Accès aux données | **Drizzle ORM** avec le pilote `@neondatabase/serverless`, migrations versionnées dans le dépôt |
| Recherche | Extension Postgres **`pg_trgm`** (recherche tolérante aux fautes), sans service externe |
| E-mails | **Resend** (via son SDK ou son API HTTP) avec des modèles React Email |
| Anti-robots | **Cloudflare Turnstile** sur les formulaires et les votes |
| Hébergement cible | **Vercel**, sur l'adresse par défaut en `.vercel.app` (pas de nom de domaine personnalisé pour l'instant) |
| Tests | Vitest pour la logique métier |

### Variables d'environnement

Aucune clé ni aucun secret ne doit être écrit dans le code. Tout passe par des variables d'environnement. Crée un fichier `.env.example` (sans valeurs réelles) qui liste :

```
DATABASE_URL=            # chaîne de connexion Neon
ADMIN_PASSWORD=          # mot de passe du back-office
SESSION_SECRET=          # pour signer le cookie de session admin
RESEND_API_KEY=
EMAIL_FROM=              # ex. "Koupi <alertes@...>"
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
NEXT_PUBLIC_APP_URL=     # ex. https://koupi.vercel.app
HASH_SALT=               # sel pour hacher les adresses IP
```

Si une variable optionnelle manque en développement, l'application doit continuer à tourner :
- sans `RESEND_API_KEY` : les e-mails sont affichés dans la console au lieu d'être envoyés ;
- sans clés Turnstile : utilise les clés de test officielles de Cloudflare (qui valident toujours).

---

## 4. Modèle de données

Le **code** est l'objet central : il relie un outil, un créateur et une source. Crée ces tables (noms en anglais, en snake_case) :

### `categories`
- `id`, `name` (ex. « Hébergement web »), `slug` (ex. `hebergement-web`), `description` (courte), `sort_order`.

### `tools`
- `id`, `name`, `slug` (unique), `category_id`, `website_url` (site officiel), `description` (une ou deux phrases), `logo_url` (optionnel), `base_price_cents` (optionnel, entier), `price_period` (`mois` | `an` | `unique`, optionnel), `price_note` (texte libre, ex. « offre Premium, engagement 12 mois »), `priority` (1 à 3, sert au tri « populaires »), `created_at`, `updated_at`.

### `creators`
- `id`, `name`, `slug` (unique), `avatar_url` (optionnel), `bio` (courte, optionnel), `platforms` (JSON : liste d'objets `{ type: "youtube" | "instagram" | "tiktok" | "podcast" | "twitch" | "site", url }`), `is_confirmed` (booléen : le créateur a confirmé lui-même ses codes, faux par défaut), `created_at`.

### `codes`
- `id`, `tool_id`, `creator_id`, `code` (texte exact, sensible à la casse, affiché tel quel)
- `discount_type` : `percent` | `fixed` | `free_months` | `other`
- `discount_value` (nombre : 15 pour 15 %, 1000 pour 10,00 €, 2 pour 2 mois offerts)
- `discount_label` (texte affiché, ex. « -15 % sur le premier achat »)
- `conditions` (texte libre : « nouveaux clients uniquement », « offre annuelle »…)
- `creator_link` (lien propre au créateur, optionnel ; ex. `https://osw.li/akdev`)
- `final_price_cents` (calculé, voir §6, stocké pour trier), `expires_at` (optionnel)
- `status` : `pending` (à valider, jamais public) | `verified` (vérifié) | `to_test` (à tester) | `expired` (expiré) | `rejected` (refusé, jamais public)
- `verified_at` (date de la dernière vérification par l'admin), `published_at`, `created_at`, `updated_at`
- Contrainte d'unicité sur (`tool_id`, `creator_id`, `code`).

### `sources`
La preuve que le code vient bien du créateur. Un code a au moins une source.
- `id`, `code_id`, `url` (vidéo ou post), `platform`, `title` (titre de la vidéo), `published_at` (date de la vidéo), `timestamp_seconds` (moment où le créateur annonce le code, optionnel), `excerpt` (extrait de la description où apparaît le code), `views` (optionnel).

### `votes`
- `id`, `code_id`, `device_id` (identifiant anonyme de l'appareil, voir §6), `ip_hash` (IP hachée avec `HASH_SALT`, jamais l'IP en clair), `worked` (booléen), `created_at`, `updated_at`.
- Contrainte d'unicité sur (`code_id`, `device_id`).

### `submissions`
Les codes proposés par le public, en attente de modération.
- `id`, `tool_name` (texte libre) et `tool_id` (si l'outil existe déjà), `creator_name`, `code`, `discount_label`, `source_url` (**obligatoire**), `creator_link` (optionnel), `comment` (optionnel), `submitter_email` (optionnel), `ip_hash`, `status` : `new` | `approved` | `rejected` | `duplicate`, `admin_note`, `created_code_id` (si approuvée), `created_at`.

### `alert_subscriptions`
- `id`, `email`, `target_type` : `tool` | `creator`, `target_id`
- `confirm_token` (aléatoire, unique), `confirmed_at` (nul tant que non confirmé)
- `manage_token` (aléatoire, unique, sert au lien de gestion dans chaque e-mail), `unsubscribed_at`, `last_sent_at`, `created_at`.
- Contrainte d'unicité sur (`email`, `target_type`, `target_id`).

### `events` (mesure interne, sans cookie)
- `id`, `type` : `search` | `copy` | `open` | `vote` | `alert_signup` | `submission`, `tool_id`, `code_id`, `query` (pour les recherches), `created_at`. Aucune donnée personnelle.

Active `pg_trgm` dans une migration et crée des index trigrammes sur `tools.name`, `creators.name` et `categories.name`.

---

## 5. Pages et fonctionnalités

Toutes les pages publiques sont rendues côté serveur (bonnes pour Google) et mises en cache avec revalidation (par exemple toutes les 5 minutes, et immédiatement quand l'admin modifie un code).

### 5.1 Accueil `/`
- Grand champ de recherche avec **autocomplétion** (voir 5.2), le slogan, une phrase qui explique la promesse pro-créateurs.
- « Outils populaires » : 8 à 12 outils qui ont au moins un code public, triés par priorité puis par nombre de copies.
- Les catégories, chacune avec son nombre d'outils.
- « Derniers codes vérifiés » : les 6 derniers codes passés en `verified`.
- Si le trousseau du visiteur n'est pas vide : bloc « Tes créateurs » avec leurs derniers codes.
- Lien vers la page transparence.

### 5.2 Recherche et autocomplétion
- Les suggestions apparaissent **dès 2 lettres**, en moins de 300 ms, avec un délai de frappe (debounce) d'environ 150 ms.
- Elles mélangent trois types, groupés et identifiés : **outils** (avec le nombre de codes actifs), **créateurs**, **catégories**. 8 suggestions maximum.
- Tolérance aux fautes et aux accents : « hostiner », « o2 switch », « nord vpn », « eleven labs » doivent trouver le bon outil. Utilise `pg_trgm` (similarité) combiné à une recherche par préfixe, et ignore la casse et les accents (`unaccent`).
- Navigation au clavier : flèches haut/bas, Entrée pour ouvrir, Échap pour fermer. Accessible (rôles ARIA de combobox).
- Entrée sans sélection : page de résultats `/recherche?q=...`.
- Une route d'API `GET /api/search?q=` renvoie les suggestions en JSON.
- Chaque recherche validée est enregistrée dans `events`.

### 5.3 Résultats `/recherche?q=`
- Liste des outils correspondants (nom, catégorie, nombre de codes actifs, meilleure réduction), puis les créateurs correspondants.
- Aucun résultat : message clair, suggestions proches (« Tu voulais dire… ? »), lien vers « Proposer un code » et vers les catégories.

### 5.4 Fiche outil `/outils/[slug]`
C'est la page la plus importante.

- En-tête : nom, logo, catégorie, courte description, lien vers le site officiel, prix de base s'il est connu.
- **Liste des codes publics** (`verified` puis `to_test`), triée par : statut, puis taux de réussite, puis prix final le plus bas. Pour chaque code :
  - le **code** en gros, en police à chasse fixe ;
  - la réduction (`discount_label`) et le **prix final après réduction** (voir §6) ;
  - le **créateur crédité** (nom, avatar, lien vers sa page Koupi), avec un badge « confirmé par le créateur » si `is_confirmed` ;
  - un badge de statut : **Vérifié**, **À tester** ou **Expiré** ;
  - « Vérifié le JJ/MM/AAAA » (ou « jamais vérifié ») ;
  - le **taux de réussite** sur 30 jours et le nombre de votes (« 92 % de réussite · 25 votes ») ; s'il y a moins de 3 votes, affiche « Pas encore assez de votes » ;
  - les conditions éventuelles ;
  - le bouton **« Copier et ouvrir »** (voir 5.5) ;
  - les boutons de vote **« Ça marche »** / **« Ça ne marche pas »** (voir 5.6) ;
  - la **source** : titre de la vidéo et date, avec un bouton « Voir le moment dans la vidéo ». Pour YouTube, ce bouton charge un lecteur intégré `youtube-nocookie.com` qui démarre à `timestamp_seconds` ; le lecteur n'est chargé qu'au clic (pas de traceur avant le clic). Pour les autres plateformes, un simple lien.
- **Codes expirés** : dans une section repliée en bas, « Codes qui ne marchent plus (N) », pour la transparence.
- **Aucun code public** : message « Aucun code pour cet outil pour l'instant », formulaire d'alerte e-mail mis en avant, lien « Tu connais un code ? Propose-le ».
- Bloc **alerte e-mail** : « Préviens-moi dès qu'un nouveau code sort pour [outil] » (voir 5.9).
- Lien « Signaler un problème » qui ouvre le formulaire de proposition prérempli (outil + commentaire).
- SEO : titre « Code promo [Outil] : N codes de créateurs vérifiés | Koupi », description, URL canonique, données structurées JSON-LD (`BreadcrumbList` et `Offer` pour chaque code vérifié), image Open Graph générée (nom de l'outil + meilleure réduction).

### 5.5 « Copier et ouvrir »
- Un seul clic : copie le code dans le presse-papiers **et** ouvre dans un nouvel onglet le `creator_link` du code s'il existe, sinon le `website_url` de l'outil. Les liens sont ouverts tels quels, sans paramètre ajouté, avec `rel="noopener"`.
- Confirmation visible : « Code copié ! Colle-le au moment de payer. » Si le presse-papiers est refusé, afficher le code sélectionné pour une copie manuelle.
- Un clic secondaire « Copier seulement » permet de copier sans ouvrir.
- Enregistre un événement `copy` (et `open`) dans `events`.
- Au retour du visiteur sur l'onglet Koupi après une copie, mettre en avant la question « Ça a marché ? » sur ce code.

### 5.6 Votes « ça marche / ça ne marche pas »
- Sans compte. **Un vote par appareil et par code** ; le visiteur peut changer son vote (on met à jour la ligne existante).
- `device_id` : un identifiant aléatoire (UUID) créé au premier vote et gardé dans le localStorage **et** dans un cookie fonctionnel (`koupi_device`, HttpOnly non requis, durée 1 an). C'est un cookie strictement nécessaire, pas de traceur publicitaire.
- Protection : jeton Turnstile vérifié côté serveur (mode invisible ou non interactif si possible), et limite de 20 votes par heure par `ip_hash`.
- Après le vote : « Merci, ton vote aide les autres. » Le taux affiché se met à jour sans recharger la page.
- Route : `POST /api/codes/[id]/vote` avec `{ worked: boolean, turnstileToken }`.

### 5.7 Page créateur `/createurs/[slug]`
- Nom, avatar, bio, liens vers ses plateformes, badge « confirmé » si `is_confirmed`.
- Tous ses codes publics, groupés par catégorie, avec les mêmes actions que sur la fiche outil (copier et ouvrir, voter).
- Bouton **« Ajouter à mon trousseau »** / « Retirer du trousseau » (voir 5.10).
- Bloc alerte e-mail : « Préviens-moi quand [créateur] partage un nouveau code ».
- SEO : « Codes promo de [Créateur] | Koupi », JSON-LD `Person`.

### 5.8 Page catégorie `/categories/[slug]` et liste `/categories`
- Tableau comparatif des outils de la catégorie : outil, meilleur code (créateur crédité), réduction, **prix final**, taux de réussite, statut, bouton « Voir les codes ».
- Tri par défaut : prix final croissant (les outils sans prix connu à la fin). Tris possibles : réduction, taux de réussite, nom.
- Filtre « seulement les codes vérifiés ».
- `/categories` liste toutes les catégories.

### 5.9 Alertes e-mail (sans compte)
- Formulaire : un champ e-mail, case de consentement claire (« J'accepte de recevoir un e-mail quand un code sort pour [cible]. Je peux me désinscrire en un clic. »), Turnstile.
- **Double confirmation** : on crée l'abonnement non confirmé et on envoie un e-mail « Confirme ton alerte ». Rien n'est envoyé d'autre tant que le lien `/alertes/confirmer/[confirm_token]` n'a pas été cliqué. Le lien expire après 7 jours.
- Si l'e-mail est déjà abonné et confirmé pour cette cible : message neutre (« C'est noté ») sans révéler l'existence de l'abonnement.
- **Envoi** : quand l'admin publie un code (`verified` ou `to_test`) pour un outil ou un créateur, un e-mail part à chaque abonné confirmé de cet outil et de ce créateur (une seule fois par personne si elle suit les deux). Au plus un e-mail par abonnement toutes les 24 h : au-delà, les nouveaux codes sont regroupés dans l'envoi suivant (une tâche programmée Vercel Cron toutes les heures traite la file).
- Contenu de l'e-mail d'alerte : outil, code, réduction, créateur crédité, lien vers la fiche outil sur Koupi.
- **Chaque e-mail** contient un lien de gestion `/alertes/gerer/[manage_token]` : voir toutes ses alertes (pour cet e-mail), en supprimer une, tout supprimer. Et un en-tête `List-Unsubscribe` pour la désinscription en un clic.
- Limite : 5 demandes d'abonnement par heure par `ip_hash`.

### 5.10 Trousseau `/trousseau`
- Liste des créateurs ajoutés par le visiteur, gardée dans le localStorage (aucune donnée envoyée au serveur sauf pour charger leurs codes).
- Affiche les derniers codes de ces créateurs, du plus récent au plus ancien.
- État vide : explication et suggestions de créateurs populaires à ajouter.
- Proposition (non obligatoire) : « Reçois un e-mail quand un de tes créateurs partage un code », qui crée une alerte par créateur.

### 5.11 Proposer un code `/proposer`
- Champs : outil (champ avec autocomplétion sur les outils existants, ou texte libre si l'outil n'existe pas), créateur (autocomplétion ou texte libre), code, réduction (texte), **lien de la source obligatoire** (URL valide de la vidéo ou du post où le créateur donne le code), lien du créateur (optionnel), commentaire (optionnel), e-mail (optionnel, pour être prévenu de la publication).
- Rappel visible : « On publie seulement les codes donnés par un créateur, avec la preuve. Pas de codes de parrainage personnels. »
- Turnstile, limite de 5 propositions par heure par `ip_hash`, détection des doublons (même outil + même code déjà en base : on le signale dans la file de modération).
- Après envoi : « Merci ! On vérifie ton code avant de le publier, en général sous 48 h. »
- Rien n'est publié sans passer par la modération.

### 5.12 Transparence `/transparence`
Page de texte, à rédiger dans le ton Koupi, avec ces sections :
- **Comment on gagne de l'argent** : aujourd'hui, on ne gagne rien. Pas de pub, pas de lien affilié à nous. Si un jour on gagne de l'argent, ce sera en vendant aux marques des statistiques sur les partenariats, jamais en prenant la place des créateurs. On l'annoncera ici.
- **Pourquoi on ne remplace jamais le code du créateur** : le créateur touche sa commission, c'est lui qui a fait le travail.
- **Comment on vérifie les codes** : chaque code vient d'une source publique (vidéo, post) ; on le teste à la main avant publication ; la date de dernière vérification est affichée ; les votes de la communauté calculent un taux de réussite sur 30 jours ; un code signalé comme mort passe en « À tester » puis en « Expiré ».
- **Les statuts expliqués** : Vérifié, À tester, Expiré.
- **Ce qu'on fait de tes données** : pas de compte, pas de cookie publicitaire, e-mail utilisé seulement pour les alertes, IP jamais stockée en clair.
- **Tu es créateur ?** : adresse de contact pour faire corriger, retirer ou confirmer ses codes.

### 5.13 Pages légales
- `/mentions-legales` et `/confidentialite` (RGPD : données collectées, finalité, durée de conservation, droit d'accès et de suppression, contact). Mets des champs à compléter entre crochets, par exemple `[Nom de l'éditeur]`, `[Adresse de contact]`.
- Pied de page sur toutes les pages : transparence, proposer un code, mentions légales, confidentialité, contact.

### 5.14 Page 404 et erreurs
- 404 utile : champ de recherche et outils populaires.
- Page d'erreur générique en français.

---

## 6. Règles de calcul (à couvrir par des tests Vitest)

### Prix final
À partir de `tools.base_price_cents` et du code :
- `percent` : `round(base × (1 − valeur / 100))`
- `fixed` : `max(0, base − valeur)`
- `free_months` et `other` : pas de prix final calculé (afficher seulement la réduction)
- Pas de prix de base connu : pas de prix final.
Affichage en euros, format français (« 3,99 € / mois »). Recalcule et stocke `final_price_cents` à chaque modification du code ou du prix de l'outil.

### Taux de réussite
- Sur les votes des **30 derniers jours** : `taux = votes « ça marche » / total des votes`.
- Moins de 3 votes sur 30 jours : pas de taux affiché.

### Changement automatique de statut
Une tâche (après chaque vote, et une tâche programmée quotidienne) applique ces règles :
- Un code `verified` passe en `to_test` si, sur les 30 derniers jours, il a au moins 5 votes et un taux inférieur à 40 %, ou si les 3 derniers votes sont tous négatifs.
- Un code `to_test` passe en `expired` s'il a au moins 10 votes sur 30 jours avec un taux inférieur à 20 %, ou si `expires_at` est dépassé.
- Seul l'admin peut repasser un code en `verified` (en le retestant, ce qui met à jour `verified_at`).
- Un code `verified` dont `verified_at` a plus de 60 jours affiche « Vérifié il y a plus de 2 mois » (sans changer de statut).
- Chaque changement automatique est enregistré dans un journal visible dans le back-office.

### Slugs
Minuscules, sans accents, mots séparés par des tirets (« Hébergement web » → `hebergement-web`, « o2switch » → `o2switch`), uniques.

---

## 7. Back-office `/admin`

Protégé par `ADMIN_PASSWORD` (formulaire de connexion, cookie de session signé, HttpOnly, Secure, SameSite=Lax, durée 7 jours, limite de tentatives). Toutes les routes `/admin` et `/api/admin/*` refusent l'accès sans session. Les pages admin ne sont pas indexées (`noindex`).

Fonctions :
- **Tableau de bord** : nombre d'outils, de codes par statut, de propositions en attente, d'abonnés confirmés ; sur 7 jours : recherches, copies, votes, et le **taux de copie** (visites de fiches outil suivies d'une copie, ou à défaut copies / recherches). C'est la mesure qui compte le plus.
- **Codes** : liste filtrable par statut, outil, créateur ; création et modification complète (avec ses sources) ; actions rapides **Valider** (→ `verified`, met `verified_at` à maintenant), **Marquer à tester**, **Marquer expiré**, **Refuser**, **Retesté aujourd'hui** (met à jour `verified_at`). Les codes `pending` forment une file « À valider ».
- **Outils**, **créateurs**, **catégories** : création, modification, suppression (suppression impossible si des codes y sont liés).
- **Propositions** : file des `submissions` nouvelles, avec signalement des doublons ; **Approuver** crée (ou retrouve) l'outil et le créateur, crée le code en `pending` avec sa source, puis ouvre sa fiche de modification ; **Refuser** avec une note. Si un e-mail a été laissé, prévenir la personne quand son code est publié.
- **Alertes** : nombre d'abonnés par outil et par créateur, journal des envois.
- **Import CSV** (voir §8).
- **Journal** des changements automatiques de statut.

---

## 8. Données de départ et import CSV

Je te joins deux fichiers CSV (séparateur virgule, champs entre guillemets possibles, UTF-8). Place-les dans `data/` à la racine du projet. Si tu ne peux pas lire les pièces jointes, crée ces deux fichiers avec seulement la ligne d'en-tête : je les remplirai moi-même.

**`data/outils-v0.csv`** : 107 outils.
En-tête : `outil,categorie,site,recherche_youtube,priorite`
- `outil` → `tools.name` ; `categorie` → crée la catégorie si elle n'existe pas ; `site` → `tools.website_url` (ajoute `https://` si absent) ; `priorite` → `tools.priority` ; `recherche_youtube` est ignoré par l'application.

**`data/candidats-p1.csv`** : 30 codes candidats, trouvés dans des descriptions de vidéos YouTube, **pas encore validés**.
En-tête : `outil,categorie,code,chaine,titre_video,url_video,date_video,vues,extrait,lien,statut`
- `outil` → retrouve l'outil par son nom ; `chaine` → crée ou retrouve le créateur (plateforme YouTube) ; `code` → `codes.code` ; `lien` → `codes.creator_link` ; `titre_video`, `url_video`, `date_video`, `vues`, `extrait` → une ligne `sources` (plateforme `youtube`).
- Tous ces codes sont importés avec le statut **`pending`** : ils ne sont pas publics tant que l'admin ne les a pas validés et n'a pas renseigné la réduction.
- Essaie de deviner `discount_type` et `discount_value` à partir de l'`extrait` (ex. « 15 % de réduction » → `percent` 15) et pré-remplis `discount_label`, mais l'admin confirme.

Prévois :
- un script `npm run db:seed` qui crée les catégories, importe les deux CSV et ne crée pas de doublons s'il est relancé (idempotent) ;
- dans le back-office, une page **Import** qui accepte un CSV de l'un de ces deux formats, montre un aperçu (lignes nouvelles, doublons, erreurs) puis importe après confirmation.

Pour que le site ne soit pas vide en développement, le seed peut aussi créer 5 codes de **démonstration** clairement marqués (créateur « Créateur démo », source `https://example.com`), désactivables par une variable `SEED_DEMO=false`. Ne jamais les créer en production.

---

## 9. Exigences transverses

- **Performance** : une fiche outil se charge en moins de 2 secondes en 4G. Images optimisées, peu de JavaScript côté client (seuls la recherche, la copie, les votes, le trousseau et les formulaires sont interactifs).
- **SEO** : `sitemap.xml` dynamique (accueil, outils, créateurs, catégories, transparence), `robots.txt` (bloque `/admin` et `/api`), balises title/description/canonical sur chaque page, URL en français et lisibles, attribut `lang="fr"`.
- **Accessibilité** : navigation complète au clavier, contrastes suffisants, libellés sur tous les champs et boutons, statuts compréhensibles sans la couleur (texte ou icône en plus), annonce des confirmations (« Code copié ») aux lecteurs d'écran.
- **Vie privée** : aucun cookie publicitaire ni traceur tiers, donc pas de bandeau de consentement. Les seuls cookies sont `koupi_device` et la session admin. IP toujours hachées avec `HASH_SALT`. Aucune police ou script chargé depuis un service qui piste (héberge les polices toi-même).
- **Sécurité** : validation de toutes les entrées côté serveur (Zod), requêtes paramétrées via Drizzle, protection contre l'injection HTML dans les textes saisis, limites de débit sur toutes les routes publiques qui écrivent en base, en-têtes de sécurité (CSP raisonnable, `X-Frame-Options`, `Referrer-Policy: strict-origin-when-cross-origin`).
- **Dates** affichées au format français (JJ/MM/AAAA, ou « il y a 3 jours »), fuseau Europe/Paris.
- **Code** : TypeScript strict, pas de `any` inutile, structure claire (`app/`, `components/`, `lib/`, `db/`), logique métier (prix final, taux, statuts, slugs) dans des fonctions pures testées.

---

## 10. Ordre de construction conseillé

1. Projet Next.js, Tailwind, Drizzle, connexion Neon, schéma et migrations, `.env.example`.
2. Seed et import CSV.
3. Back-office : connexion, codes, outils, créateurs, catégories.
4. Pages de lecture : fiche outil, page créateur, catégories, accueil, transparence, pages légales.
5. Recherche et autocomplétion.
6. « Copier et ouvrir », votes, taux de réussite, changements de statut automatiques.
7. Proposer un code et file de modération.
8. Alertes e-mail (double confirmation, envoi, gestion) et trousseau.
9. SEO (sitemap, JSON-LD, images Open Graph), tests Vitest, README.

---

## 11. Critères d'acceptation (la V0 est finie quand…)

- [ ] `npm run db:migrate` puis `npm run db:seed` remplissent une base Neon vide avec les 107 outils, 12 catégories et 30 codes en `pending`.
- [ ] Dans le back-office, je valide un code en renseignant sa réduction : il apparaît sur la fiche outil avec le créateur, la date de vérification et le prix final.
- [ ] Taper « hostiner » ou « nord vpn » dans la recherche propose le bon outil dès 2 lettres.
- [ ] « Copier et ouvrir » copie le code et ouvre le lien du créateur s'il existe, sinon le site officiel, sans aucun paramètre ajouté.
- [ ] Je vote « Ça marche », je recharge : mon vote est gardé ; je change d'avis : le vote est remplacé, pas ajouté.
- [ ] Un code `verified` qui reçoit 5 votes négatifs passe automatiquement en `to_test`.
- [ ] Je propose un code sans lien source : refusé. Avec un lien : il arrive dans la file de modération, rien n'est publié.
- [ ] Je m'abonne à une alerte : je reçois un e-mail de confirmation (ou il s'affiche dans la console en local) ; après confirmation, la publication d'un code sur cet outil m'envoie une alerte avec un lien de gestion qui marche.
- [ ] J'ajoute un créateur au trousseau, je ferme et rouvre le navigateur : il est toujours là.
- [ ] `/admin` est inaccessible sans mot de passe.
- [ ] Aucune clé ni aucun secret n'est présent dans le code source.
- [ ] `npm run test` passe (prix final, taux de réussite, changements de statut, slugs).
- [ ] Le `README.md` explique comment lancer le projet, les variables d'environnement, et comment déployer sur Vercel avec Neon.
