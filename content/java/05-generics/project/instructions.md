## Où on en est

Ordo a ses ordres, ses transactions, ses commissions et son journal (jalons 1 à 4, repris tels quels). Le moteur va publier ce qui arrive aux ordres, décrit par `OrderEvent` (fourni) : une interface scellée avec `Accepted`, `Filled` (avec la `Trade`) et `Cancelled`. Plusieurs composants s'y abonnent, chacun à ce qui l'intéresse. Tu écris `EventBus`.

## M1 — S'abonner à un type

- `bus.subscribe(OrderEvent.Filled.class, f -> …)` : le gestionnaire reçoit des `Filled`, **sans cast** chez l'abonné, et seulement eux.
- `bus.publish(event)` livre à chaque abonné concerné, dans l'ordre des abonnements.
- Fermer l'`AutoCloseable` renvoyé par `subscribe` arrête la livraison à cet abonné.

## M2 — Des abonnés plus généraux

- S'abonner à `OrderEvent.class` reçoit **tous** les événements.
- Un `Consumer<Object>` (un journal générique) peut s'abonner à `Filled.class`.
- `publishAll` accepte une `List<OrderEvent.Filled>`.

## M3 — Un historique typé, sans cast

- `bus.history(OrderEvent.Filled.class)` renvoie une `List<OrderEvent.Filled>` des événements déjà publiés de ce type (et de ses sous-types), dans l'ordre, non modifiable.
- `EventBus.java` compile avec `-Xlint:all -Werror` : aucun cast non vérifié, aucun `@SuppressWarnings`.

Ne modifie que `EventBus.java`.
