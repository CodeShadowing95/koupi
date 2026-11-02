# ADR-0015 : Date de fin facultative sur les codes

## Statut
Proposée

## Date
2026-11-02

## Contexte
La plupart des codes de créateurs n'ont pas de date de fin : ils vivent tant que dure le partenariat. Certains en ont une, écrite dans la description (« jusqu'au 31/12 »). L'IA la relevait déjà, sans qu'on puisse la garder.

## Décision
- Colonne `codes.expires_on` (type `date`, vide par défaut), migration `0006_code_expiry`. Validée par Vastolorde.
- Remplie par l'admin (champ « Valable jusqu'au » du formulaire), ou par l'IA lors d'une analyse si le champ est vide. L'IA n'écrase jamais une date déjà saisie.
- Sur le site : « Valable jusqu'au … » quand la date est loin, « Expire dans N jours » à moins de 7 jours, et « Peut-être expiré » à la place du badge vérifié une fois la date passée. Un code sans date n'affiche rien.
- Un code vérifié dont la date est passée depuis son dernier test remonte dans l'onglet Retests. Si l'admin le valide quand même, la date passée est retirée : elle était fausse.
- Les jours sont comparés à la date du jour à Paris.

## Conséquences
- Une colonne de plus, sans effet sur les codes existants (tous sans date).
