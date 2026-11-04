# ADR-0029 : Page « Ton avis » et avis des visiteurs en base

## Statut
Acceptée

## Date
2026-11-04

## Contexte
Koupi démarre : les premiers visiteurs savent mieux que personne ce qui bloque. L'éditeur veut recevoir leurs remarques, idées et problèmes, et les lire dans l'admin. Un formulaire dans le pied de page a été écarté : trop discret, et sans place pour expliquer à quoi servent les avis.

## Décision
- Une page publique `/feedback` (« Ton avis »), liée dans le menu et le pied de page, que l'admin peut couper comme les autres (ADR-0022).
- Une table `feedback` : type (`remark`, `idea`, `problem`), message (2 000 caractères au plus), e-mail facultatif, chemin de la page d'où venait le visiteur, statut (`new`, `read`, `done`), note de l'admin, empreinte de l'IP (jamais renvoyée), dates.
- Mêmes protections que les autres formulaires publics : Turnstile en production, 5 envois par IP et par heure, validation côté serveur. Seul un chemin du site est gardé comme provenance, jamais une adresse externe.
- Page admin `/admin/retours`, avec un nombre dans le menu pour les avis non lus.

## Alternatives envisagées
- **Formulaire dans le pied de page** : refusé par l'éditeur.
- **Service externe (Tally, Google Forms)** : rien à coder, mais les messages sortent de Koupi et la promesse « zéro pistage » en pâtirait.
- **Simple lien mailto** : pas de tri, et l'adresse du visiteur devient obligatoire.

## Conséquences
- Une table de plus, purgée à la main sur demande (page Confidentialité).
- L'e-mail n'est jamais exporté ni affiché ailleurs que dans Retours.
