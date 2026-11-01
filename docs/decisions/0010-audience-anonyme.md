# ADR-0010 : Votes et mesure d'audience anonymes, dans notre base

## Statut
Proposée

## Date
2026-11-01

## Contexte
L'admin a besoin de savoir quels codes servent (copies, liens ouverts), ce que les visiteurs cherchent sans le trouver, et si un code marche encore (votes). Koupi promet « zéro pub, zéro pistage » : pas d'outil d'analyse tiers, pas de cookie, rien qui permette de suivre une personne.

## Décision
- **Votes** : `POST /api/codes/[id]/vote` ajoute 1 à `votes_up` ou `votes_down` du code. Seuls les totaux sont gardés. Une IP hachée (sel secret) limite à un vote par code et par jour, et à 30 votes par heure ; ces clés de limite sont effacées après 24 h. Le navigateur garde le vote en `localStorage` pour ne pas reposer la question.
- **Audience** : table `daily_counters` (jour, mesure, clé, total). Mesures : `copy` et `open` (clé = id du code, envoyées par `navigator.sendBeacon` vers `/api/events`), `search_empty` (clé = recherche normalisée, 60 caractères au plus, comptée côté serveur sur `/search`). Aucun identifiant de visiteur n'est stocké.
- L'admin lit ces totaux par `/api/admin/audience` (7, 30 ou 90 jours) : accueil et page Statistiques.

## Alternatives envisagées
- **Plausible, Umami, Vercel Analytics** : simples, mais un service tiers ou un script de plus, contraire à la promesse.
- **Compter les visiteurs uniques** : demande un identifiant (cookie ou empreinte). Écarté : on compte des gestes, pas des personnes.

## Conséquences
- Pas de chiffre de « visiteurs », par choix. Les copies et ouvertures suffisent pour montrer aux marques ce que Koupi apporte.
- Une recherche peut contenir du texte libre : elle est tronquée et n'est reliée à personne. La page Confidentialité l'explique.
