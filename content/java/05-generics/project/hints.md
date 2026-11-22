## Hint 1
C'est un conteneur hétérogène typé (leçon 5) : chaque abonnement porte son jeton `Class<E>`. Pour livrer sans avertissement : `type.isInstance(event)`, puis `handler.accept(type.cast(event))`.

## Hint 2
Garde chaque abonnement dans un petit `record Subscription<E extends OrderEvent>(Class<E> type, Consumer<? super E> handler)` avec une méthode `deliver(OrderEvent e)` : le `E` du jeton et celui du consommateur sont liés par le type du record, donc le cast vérifié suffit. La liste des abonnements est une `List<Subscription<?>>`.

## Hint 3
PECS : le gestionnaire **consomme** des `E` (`Consumer<? super E>`), `publishAll` lit une liste (`List<? extends OrderEvent>`). `history` construit une `ArrayList<E>` avec `type.cast` et renvoie `List.copyOf(...)`.
