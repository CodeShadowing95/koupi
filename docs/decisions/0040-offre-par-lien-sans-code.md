# ADR-0040 : Une offre peut se donner par un lien, sans code

## Statut
Acceptée

## Date
2026-11-07

## Contexte
Beaucoup de créateurs ne donnent pas de code mais un lien d'affiliation (« KrispCall : https://try.krispcall.com/tad »). Pour le visiteur, l'économie est la même : il ouvre le lien et l'offre s'applique. Jusqu'ici, la colonne `codes.code` était obligatoire. Un lien seul ne pouvait donc pas entrer au catalogue, et le repérage prenait parfois la fin du lien (« tad ») pour un code.

Chaque code avait déjà un « lien du créateur » facultatif (`codes.creator_link`), ouvert après la copie.

## Décision
- `codes.code` devient facultatif. Une contrainte `codes_code_or_link` exige le code **ou** le lien de l'offre (`creator_link`). La contrainte de longueur ne s'applique qu'à un code présent.
- Dans l'application, le type `Code` garde `code: string`, et `''` veut dire « offre par lien ». La lecture en base fait `coalesce(code, '')` (`lib/offer-link.ts` : `isLinkOffer`, `offerName`, `findLinkInText`).
- Doublon : pour un même outil, une deuxième offre sans code avec le même lien est refusée.
- Vérifications : une offre par lien est prouvée quand son lien figure dans la source.
- Lecture par l'IA (`lib/ai-extract.ts`) : chaque offre rendue a un `link`. Le lien n'est gardé que s'il est écrit dans la description et qu'il ne mène pas à un réseau du créateur (`offerLinkAllowed`). Une offre sans code demande en plus une réduction annoncée : un simple lien vers l'outil n'est pas une offre. L'analyse ajoute le lien trouvé à un code qui n'en a pas, comme la date de fin.
- `tool_suggestions` suit le même modèle (migration 0030) : `code` facultatif, nouvelle colonne `link`, et l'unicité porte sur le code ou, à défaut, sur le lien.
- Les sous-domaines des liens d'affiliation (`try.`, `get.`, `go.`, `join.`, `partners.`…) ne changent pas l'outil : `try.krispcall.com` est rattaché à krispcall.com.
- Site : le talon du coupon devient un lien « Profiter de l'offre », marqué « lien d'affiliation » et ouvert avec `rel="sponsored noopener noreferrer"`. Les coupons du haut de la présentation ne montrent que des codes à copier.

## Alternatives envisagées
- **Un type d'offre séparé (table `offers`)** : plus propre en théorie, mais il faudrait doubler les votes, les vérifications, les copies et les pages pour une seule différence, l'absence de code.
- **Code fictif (« LIEN »)** : aucun changement de schéma, mais il serait copié, cherché et compté comme un vrai code.

## Conséquences
- Le formulaire de l'admin accepte un code vide quand le lien de l'offre est rempli, et l'inverse.
- Toute nouvelle lecture de `codes.code` doit penser au cas vide : afficher « Lien seul » ou « offre par lien », et ne rien proposer à copier.
- Les liens d'affiliation sont des liens de suivi chez la marque. Merkod ne les ajoute jamais lui-même : ce sont ceux du créateur, ouverts tels quels.
