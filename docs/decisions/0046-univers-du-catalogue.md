# ADR-0046 : Univers du catalogue, les marques hors outils gardées mais cachées

## Statut
Proposée

## Date
2026-11-09

## Contexte
La collecte automatique (chaînes suivies, podcasts, recherches YouTube) relève tous les codes promo des descriptions,
pas seulement ceux des outils en ligne. Le catalogue en production contenait des marques de vêtements, de compléments
alimentaires, de literie, de tondeuses ou de cigares, dont 71 rangées dans « Boutiques en ligne ». Elles apparaissaient
sur le site et dans le sitemap, ce qui brouille la promesse « les codes des créateurs pour les outils en ligne » et le
référencement. Les jeter ferait perdre des codes vérifiables et des créateurs (une créatrice beauté est aussi une cliente
possible de l'espace créateur). Le propriétaire a validé la proposition « univers » le 9 novembre 2026.

## Décision
- Un niveau au-dessus des familles : la table `universes` (slug, nom, position, `visible`) et la colonne
  `category_families.universe_slug` (par défaut `outils-en-ligne`). Une catégorie et ses outils prennent l'univers de
  leur famille ; une catégorie sans famille est dans « Outils en ligne ». Aucune colonne sur les outils ni sur les codes.
- Univers de départ : Outils en ligne (visible), Beauté et soins, Mode, High-tech et maison, Autres (cachés). Au premier
  rangement d'une marque dans un univers vide, Merkod lui crée une famille et une catégorie d'accueil du même nom
  (« Autres marques » pour Autres). Les 14 familles existantes restent dans « Outils en ligne ».
- Le site public lit `getCatalog()`, qui passe par `publicCatalog()` (`lib/universes.ts`) : les outils, codes, catégories
  et familles des univers cachés en sont retirés. Explorer, recherche, pages outil, créateur et catégorie, images de
  partage et sitemap en héritent. L'admin et l'espace créateur lisent `getFullCatalog()`, qui garde tout.
- « Outils en ligne » ne peut pas être caché. Allumer ou éteindre un univers se fait dans Administration et est noté
  dans le journal.
- « ✦ Ranger par univers » (Catégories) : l'IA lit le nom, le site et la catégorie des marques des outils en ligne, par
  lots de 60 (un appel court par lot, enchaînés par le navigateur), et propose un univers pour celles qui n'en sont pas.
  Rien ne bouge sans l'accord de l'admin ; les marques retenues partent dans la catégorie d'accueil de leur univers.
  Coût compté dans le plafond mensuel de l'IA (`ai_usage.purpose = 'universe_sort'`).
- « Outils à ajouter » : l'analyse d'un outil par l'IA (`lib/tool-analysis.ts`) reçoit aussi la liste des univers et
  l'univers de chaque catégorie, et rend `universe` : celui de la catégorie choisie, sinon celui qu'elle devine pour une
  nouvelle catégorie (« Outils en ligne » par défaut ou s'il est inconnu). L'analyse reste dans le jsonb
  `tool_suggestions.analysis`, sans changement de schéma. À l'ajout, une nouvelle catégorie hors « Outils en ligne » est
  créée dans la famille d'accueil de l'univers choisi par l'admin (pré-rempli par l'IA).

## Conséquences
- Une seule migration (0034), réversible en remettant `visible` à vrai ou les familles dans « Outils en ligne ».
- Les étapes suivantes n'ont pas besoin de schéma : l'IA qui devine l'univers d'une marque inconnue dans « Outils à
  ajouter », une file de vérification par univers, la niche des créateurs, puis des onglets d'univers sur le site quand
  un univers est allumé.
- Les copies et votes d'un code caché restent comptés en base ; seuls les visiteurs ne le voient plus.
