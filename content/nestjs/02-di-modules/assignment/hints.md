## Hint 1
Demande-toi ce que les deux services se disputent. Ce n'est pas le comportement de l'autre, c'est une **donnée** : l'état de la commande.

## Hint 2
Si cette donnée vit dans un troisième provider, dont `OrdersService` et `PaymentsService` dépendent tous les deux, alors aucun des deux n'a besoin de l'autre pour le remboursement. Le graphe devient Orders → Payments → Ledger, et Orders → Ledger.

## Hint 3
Crée `Ledger` (commandes + paiements) dans `ledger.ts`, exporté par un `LedgerModule`. `PaymentsService.refund` appelle `ledger.setStatus(orderId, 'refunded')` ; `OrdersModule` importe `LedgerModule` et `PaymentsModule` ; `PaymentsModule` n'importe plus que `LedgerModule`.
