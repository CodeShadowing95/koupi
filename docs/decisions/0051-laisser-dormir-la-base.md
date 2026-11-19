# ADR-0051 : Laisser dormir la base entre les visites

## Statut
Acceptée

## Date
2026-11-19

## Contexte
Le 19 novembre, la base Neon de production a été bloquée (erreur 402 « exceeded the quota »), lecture comprise : le plan gratuit donne 100 heures de calcul et 5 Go de transfert par mois. Neon met la base en veille après 5 minutes sans requête, mais Merkod lui parlait sans arrêt :

- le middleware lisait l'état du site (pages coupées, maintenance) dans la base, au plus toutes les 5 secondes par instance, pour chaque visite, préchargement de lien et passage de robot ;
- les pages publiques relisaient cet état toutes les minutes et le catalogue toutes les 5 minutes ;
- chaque page vue envoyait cinq mesures de vitesse, chacune écrite en base avec une limite de débit.

Avec un robot qui passe toutes les quelques minutes, la base ne dormait jamais : 100 heures à 0,25 de puissance font environ 17 jours.

## Décision
- Le middleware ne touche plus la base. Il lit l'état du site sur `/api/site-state`, qui le sert depuis le cache de Next (`getSiteState`), et le garde une minute par instance.
- L'état du site est gardé en cache un jour, et le catalogue une heure. Les réglages de l'admin, les modifications du catalogue et les votes vident déjà ces caches aussitôt (`revalidateSiteState`, `revalidateCatalog`).
- Un chargement de page sur dix envoie ses mesures de vitesse, et aucun pour un navigateur automatisé (`navigator.webdriver`).

## Alternatives envisagées
- **Passer au plan payant de Neon** : il est facturé à l'usage et débloque tout de suite, mais le projet n'a pas de revenus. On garde cette option pour une urgence.
- **Variable d'environnement pour la maintenance** : elle ne demande aucune requête, mais il faut redéployer pour chaque changement et elle ne couvre pas les pages coupées depuis l'admin.
- **Edge Config de Vercel** : lecture sans base, mais c'est un service et une dépendance de plus.

## Conséquences
- Un interrupteur de l'admin s'applique partout en moins d'une minute, contre 5 secondes avant.
- Les copies et les votes d'un créateur affichés sur le site peuvent avoir jusqu'à une heure de retard, sauf après un vote, qui vide le cache.
- L'onglet Vitesse compte dix fois moins de mesures. Les pourcentages restent justes.
- Les visites réveillent encore la base quand le cache expire ou qu'un visiteur écrit (vote, copie, proposition), mais elle peut maintenant se rendormir.
