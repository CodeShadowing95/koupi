# ADR-0022 : Administration du site (pages, mode maintenance, journal)

## Statut
Proposée

## Date
2026-11-03

## Contexte
Le super admin (seul administrateur du site, connecté avec le mot de passe de l'admin) veut contrôler ce que les visiteurs voient : couper une page publique (elle doit répondre 404 et disparaître des menus et des liens), la rallumer, et mettre tout le site en pause. Il ne veut aucune surveillance des visiteurs (RGPD, promesse « zéro pistage »). Il n'y aura pas d'autres administrateurs : pas de comptes ni de rôles.

## Décision
- Table `site_settings` (clé, état, date) : une ligne `page:<clé>` par page coupée ou rallumée, une ligne `maintenance`. Clé absente = valeur par défaut (page en ligne, pas de maintenance). La liste des pages, leurs adresses et celles qui sont verrouillées (accueil, mentions légales, confidentialité) sont dans le code (`lib/site-pages.ts`), pas en base.
- Le middleware passe au runtime Node (stable dans Next 15.5) pour lire cet état en base, gardé 5 secondes par instance. Page coupée : réécriture vers une adresse inexistante, donc la page 404 du site avec le statut 404 ; ses routes d'API répondent 404. Maintenance : réécriture vers `/maintenance` avec le statut 503 et `Retry-After`, sauf pour l'admin connecté, l'admin, ses API, les tâches planifiées et les fichiers. Base injoignable : le site reste ouvert.
- Les liens : le layout du site lit l'état (cache taggé, rafraîchi au changement) et le donne à un contexte. `SiteLink` remplace `next/link` sur le site public : vers une page coupée, un bouton disparaît et un lien devient du texte. Le menu et le pied de page filtrent leurs entrées.
- Table `admin_audit_log` (action, cible, date) : le journal des gestes de l'espace Administration, sans IP ni navigateur, effacé après 12 mois par la tâche de nuit.

## Alternatives envisagées
- **Vérifier dans chaque page (`notFound()`)** : à répéter dans chaque page et sous-page, facile à oublier ; ne couvre pas les API. Écarté.
- **Variables d'environnement Vercel** : un redéploiement à chaque changement. Écarté.
- **Middleware Edge appelant une route interne** : un aller-retour HTTP de plus à chaque requête. Écarté pour le runtime Node.
- **Comptes administrateurs et rôles** : proposés dans le plan, abandonnés à la demande du super admin (un seul administrateur).

## Conséquences
- Toutes les pages publiques sont rendues à la demande (le layout lit l'état du site) : pas de page figée au build avec un lien vers une page coupée.
- Une requête par instance toutes les 5 secondes au plus pour l'état du site.
- Ajouter une page publique demande de l'ajouter à `SITE_PAGES` pour qu'elle soit pilotable.
