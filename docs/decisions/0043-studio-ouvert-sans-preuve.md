# ADR-0043 : Le Studio s'ouvre sans revendication ni preuve

## Statut
Acceptée

## Date
2026-11-08

## Contexte
Jusqu'ici, un créateur n'entrait dans son studio qu'après avoir revendiqué une page existante et prouvé un de ses comptes par la bio (ADR-0041). Une page ne naissait qu'avec un premier code validé par l'admin. Un créateur sans chaîne, avec peu d'abonnés, ou simplement pressé, trouvait une porte fermée et repartait.

## Décision
- L'espace créateur est ouvert à tous. Les étapes « Page revendiquée » et « Preuve par ta bio » deviennent facultatives.
- « Passer cette étape » demande seulement un nom de créateur : Merkod crée une page à ce nom (table `creators`, sans compte) et y relie le compte (`creator_users.creator_id`, `access_granted_at`). Le studio s'ouvre tout de suite.
- Cette page est « non vérifiée » tant qu'aucun compte n'est prouvé : le niveau du créateur reste calculé à partir des comptes (ADR-0016), rien ne change dans le schéma.
- Garde-fou : le nom, son adresse ou le @ d'un compte ne peuvent pas reprendre ceux d'une page existante. Merkod propose alors de revendiquer cette page.
- Une page sans code publié reste invisible sur le site public, comme avant.
- Les codes d'un créateur non prouvé passeront par la relecture de l'admin ; ceux d'un compte prouvé seront publiés sans attente (PR suivantes).

## Alternatives envisagées
- **Créer la page en collant le lien de sa chaîne** : utile pour les créateurs avec du public, mais ne sert à rien à ceux qui n'ont pas de chaîne. Gardé comme incitation (« Fais vérifier ta chaîne »), pas comme passage obligé.
- **Garder « propose un code et attends »** : écarté, c'est la friction qui fait fuir les créateurs.

## Conséquences
- N'importe qui peut ouvrir un studio : la confiance se gagne par la preuve, plus par la porte d'entrée.
- Des pages sans compte apparaissent en base ; l'admin les voit dans Administration (comptes créateurs) et, plus tard, dans « Pages à relier » quand elles ressemblent à une page existante.
