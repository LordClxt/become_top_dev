## Hint 1
Pour rendre « une seule instance par code », il faut se souvenir des instances déjà créées : un champ statique qui associe un code à son `HttpStatus` suffit. Pense à l'ordre d'initialisation : le cache doit exister **avant** que les constantes `OK` et `NOT_FOUND` appellent `of`.

## Hint 2
`Map.computeIfAbsent(code, c -> new HttpStatus(...))` crée l'instance seulement si elle manque et renvoie celle qui existe sinon. Une `ConcurrentHashMap` rend l'opération sûre entre threads. Pour `from`, `strip()`, puis `split("\\s+", 2)[0]`, puis `Integer.parseInt` : traduis la `NumberFormatException` en `IllegalArgumentException`.

## Hint 3
Constructeurs : passe celui de `HttpStatus` en `private`. Dans `StatusCodes`, ajoute un constructeur `private` qui lève `new AssertionError(...)` ; sans constructeur explicite, Java en génère un public. Rends les deux classes `final` : avec un constructeur privé, personne ne peut les étendre de toute façon.
