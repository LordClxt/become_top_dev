## Hint 1
Un tableau indexé par `ordinal()` dépend de l'ordre des constantes : insérer `HALTED` a décalé toutes les colonnes. Et si chaque changement disait lui-même d'où il part et où il va ?

## Hint 2
Un constructeur `PhaseChange(SessionPhase from, SessionPhase to)` et deux champs `final`. La table devient une `Map<SessionPhase, Map<SessionPhase, PhaseChange>>`, faite d'`EnumMap`, **construite** à partir de `values()`.

## Hint 3
`Stream.of(values()).collect(groupingBy(c -> c.from, () -> new EnumMap<>(SessionPhase.class), toMap(c -> c.to, c -> c, (x, y) -> { throw … }, () -> new EnumMap<>(SessionPhase.class))))`, déclarée **après** les constantes. `reachableFrom` : `EnumSet.copyOf(table.get(from).keySet())`, ou un ensemble vide.
