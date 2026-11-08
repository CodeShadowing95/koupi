# ADR-0042 : Codes repris d'une vidéo « compilation »

## Statut
Acceptée

## Date
2026-11-08

## Contexte
Certaines chaînes publient des listes de codes d'autres créateurs (« 1. Autodoc — code Baptiste (Baptiste Pitois) 2. Saily — code NOZMAN (Dr Nozman) »). Merkod créditait chaque code à la chaîne qui fait la liste (« Backed ») : le créateur qui donne vraiment le code n'était pas crédité, et la vidéo servait de preuve alors qu'elle n'est pas la sienne.

## Décision
- L'IA rend pour chaque code un champ `creator` : le créateur à qui la description l'attribue, quand ce n'est pas l'auteur de la vidéo. Il n'est gardé que s'il est écrit tel quel dans la description.
- Recherche YouTube et chaînes suivies (`lib/compilation-creator.ts`) : quand ce nom n'est pas celui de la chaîne (`sameCreator`), le code est crédité à ce créateur :
  1. créateur déjà en base sous ce nom ;
  2. sinon, recherche de sa chaîne YouTube par son nom (`search.list type=channel`, 100 unités) : une chaîne qui porte ce nom est reliée au créateur, créé sous le nom exact de la chaîne (ou au créateur qui a déjà cette chaîne) ;
  3. sinon, créateur créé par son nom, sans chaîne.
  Un nom n'est cherché qu'une fois par passage ; ensuite il est en base.
- Le code reste en attente, avec une note qui commence par « Repris d'une compilation » (`lib/compilation-note.ts`). L'analyse le reconnaît : le dossier n'est jamais « clair », et les autres codes de la vidéo ne sont pas ajoutés une deuxième fois. Le rattachement automatique des chaînes YouTube ignore ces codes, pour ne pas relier la chaîne de la compilation au créateur crédité.
- Pas de changement de schéma : la note sert de marque.

## Alternatives envisagées
- **Écarter les compilations** : simple, mais on perd des codes réels de créateurs connus.
- **Colonne dédiée sur `codes`** : plus propre que la note, mais un changement de schéma pour un cas rare ; à reprendre si d'autres règles en dépendent.

## Conséquences
- Une recherche de chaîne coûte 100 unités par nom inconnu ; une vidéo compilation de 10 créateurs peut coûter 1 000 unités la première fois.
- Les codes déjà crédités à la chaîne d'une compilation ne sont pas corrigés : à reprendre à la main.
