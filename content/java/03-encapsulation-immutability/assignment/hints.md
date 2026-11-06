## Hint 1
Fais un seul constructeur privé qui reçoit des collections **déjà immuables** et valide tout. `build()` copie (`List.copyOf`, `Map.copyOf`) et l'appelle ; `withPort` l'appelle avec les collections de `this`, sans les recopier : elles sont immuables, donc partageables.

## Hint 2
`Map.copyOf(roles)` ne copie que le premier niveau : les `Set` de permissions du builder restent partagés et modifiables. Copie chaque ensemble d'abord (`Set.copyOf`, ou mieux une copie qui garde l'ordre, rendue non modifiable).

## Hint 3
Pour les hôtes sans doublon et dans l'ordre d'ajout, le builder peut utiliser un `LinkedHashSet` puis `List.copyOf(set)` au build. Pour toString, construis une `TreeMap` d'affichage où les valeurs secrètes sont remplacées.
