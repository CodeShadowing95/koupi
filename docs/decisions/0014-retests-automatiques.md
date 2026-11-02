# ADR-0014 : Retests automatiques par une tâche planifiée Vercel

## Statut
Proposée

## Date
2026-11-02

## Contexte
Un code « vérifié » peut mourir sans prévenir : la vidéo est supprimée, le créateur change de partenaire, l'offre expire. L'admin retestait à la main les codes de plus de 30 jours (onglet « À retester » de Codes). Avec l'analyse automatique (ADR-0012, ADR-0013), Koupi peut relire ces sources tout seul.

## Décision
- Une tâche planifiée Vercel (`crons` dans `vercel.json`) appelle `/api/cron/retest` chaque nuit à 3 h UTC. Vercel l'authentifie avec l'en-tête `Authorization: Bearer <CRON_SECRET>` ; sans `CRON_SECRET`, la route refuse tout.
- Elle relit au plus 40 codes par nuit (`RETEST_BATCH`) : vérifiés, non archivés, testés il y a plus de 30 jours ou jamais datés, sans analyse depuis 30 jours, et dont la source est lisible (YouTube pour l'instant). Les plus anciens passent d'abord. Une nuit coûte au plus 40 unités de quota YouTube ; l'IA reste soumise au plafond mensuel.
- Rien n'est modifié automatiquement. Un code dont la nouvelle analyse n'est plus claire remonte dans l'onglet « Retests » de la page Vérifications ; l'admin le confirme, le teste au paiement ou le rejette.
- Le même travail se lance à la main depuis l'admin (`/api/admin/verifications/retest`), car Vercel ne lance les tâches planifiées que sur la production.

## Alternatives envisagées
- **GitHub Actions planifiée** : marche aussi sur la pré-production, mais demande d'exposer un secret de plus dans GitHub et une URL publique à appeler.
- **Changer le statut tout seul** (passer en « À tester » si la source a disparu) : plus rapide, mais une erreur passagère de YouTube ferait disparaître un bon code. L'admin garde la décision.

## Conséquences
- Une variable de plus à créer sur Vercel : `CRON_SECRET`.
- Le plan gratuit de Vercel limite les tâches planifiées à une fois par jour, ce qui suffit ici.
