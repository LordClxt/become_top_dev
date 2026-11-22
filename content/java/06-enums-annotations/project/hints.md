## Hint 1
Leçon 2, la table de transitions : un enum `Transition` imbriqué, dont chaque constante porte `from` et `to` (`ACCEPT(NEW, ACCEPTED)`). Un champ statique de `OrderStatus` construit une `EnumMap<OrderStatus, Set<OrderStatus>>` à partir de `Transition.values()` : les champs statiques s'initialisent après les constantes, donc elles existent déjà.

## Hint 2
Dans `OrderTracker`, abonne-toi à `OrderEvent.class` et fais un `switch` sur l'événement (interface scellée, pas de `default`). Calcule le statut visé, vérifie `current.canMoveTo(target)` avec `current = statuses.getOrDefault(id, NEW)`, et seulement ensuite enregistre. Pour le décompte : une `EnumMap` pré-remplie à `0L` pour chaque statut, puis `merge`.

## Hint 3
Leçon 3 : `<T extends Enum<T> & OrderCheck>` garantit que `type.getEnumConstants()` n'est pas `null` et que chaque constante a `passes`. Range tous les contrôles dans une `List<OrderCheck>` (pas un `EnumSet` : ils viennent de plusieurs enums).
