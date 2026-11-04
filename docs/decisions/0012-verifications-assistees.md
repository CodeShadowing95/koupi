# ADR-0012 : Vérifications assistées : analyses et sources suivies en base

## Statut
Proposée

## Date
2026-11-02

## Contexte
Si Merkod décolle, les codes trouvés par les scripts et les propositions des visiteurs arriveront plus vite qu'une personne seule ne peut les vérifier. La spec « vérifications assistées par IA » prévoit des contrôles automatiques, un score de confiance sur 100 (`lib/verification.ts`), puis une lecture des descriptions par l'IA. L'admin garde la décision finale. Il faut garder la preuve de chaque analyse, suivre le coût de l'IA et savoir quelles chaînes et quels podcasts lire.

## Décision
- Table `verification_checks` : une ligne par analyse d'un code ou d'une proposition (score, raisons, extrait de la source, champs lus par l'IA, modèle, coût en millionièmes de dollar). On n'efface rien : c'est la preuve montrée à l'admin et la base du plafond mensuel de l'IA.
- Table `watched_sources` : chaînes YouTube et podcasts suivis, identifiés par leur ID stable sur la plateforme (unique par plateforme).
- Colonne `codes.payment_tested_at` et action `payment_test` dans `code_logs` : badge « Testé au paiement ». Le statut `verified` existant devient « Source vérifiée » sur le site.
- Le plafond mensuel de l'IA reste une variable d'environnement, sans table.

## Alternatives envisagées
- **Garder seulement le dernier score sur le code** : plus simple, mais on perd l'historique des preuves et le calcul du coût.
- **Un statut de plus pour « testé au paiement »** : un code testé reste aussi « source vérifiée » ; une date suffit et dit quand le test a eu lieu.

## Conséquences
- Les niveaux de créateur (Repéré, Contrôlé par Merkod, Créateur vérifié) viendront avec la table des comptes créateurs, pas ici.
- La table des analyses grossit avec chaque retest ; à surveiller, un nettoyage des analyses anciennes et sans coût pourra venir plus tard.
