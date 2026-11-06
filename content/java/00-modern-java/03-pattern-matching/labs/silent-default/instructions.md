## Contexte

Message de la comptable, lundi matin :

> Depuis la mise en production de jeudi, le solde du rapport du soir ne correspond plus au relevé de la banque. Ce n'est jamais le même écart. Le 14 mars, on avait 4 ventes, et on a trouvé 134,00 € de différence. Je n'ai rien changé de mon côté.

Jeudi, l'équipe a livré la gestion des rétrofacturations (une banque reprend l'argent d'une vente contestée) et quelques nettoyages dans le calcul des frais.

Le code est réparti dans quatre fichiers : `Event.java` (les événements comptables), `FeePolicy.java` (le barème des frais), `Ledger.java` (le solde), `Report.java` (le rapport du soir). Les tests reproduisent des journées réelles, rapprochées à la main avec la banque.

## Ta mission

1. Trouve **pourquoi** le solde est faux. Il y a plus d'une cause.
2. Corrige-les.
3. Fais en sorte que la **prochaine** variante d'événement ajoutée à `Event` ne puisse plus être oubliée silencieusement : le compilateur doit signaler chaque endroit à mettre à jour.

## Le barème (contractuel)

| frais | montant |
|---|---|
| retard (`LATE`) | 3,00 € |
| annulation (`CANCELLATION`) | 5,00 € |
| change (`CURRENCY`) | 1,50 € |

Une vente ajoute son montant au solde ; un remboursement, une rétrofacturation et des frais le retirent.
