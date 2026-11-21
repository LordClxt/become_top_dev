## Hint 1
Un `@Around("@annotation(idempotent)")` reçoit l'annotation de la méthode en paramètre : `idempotent.keyArg()` dit où lire la clé dans `call.getArgs()`.

## Hint 2
La clé de mémorisation doit contenir la méthode (par exemple `call.getSignature().toLongString()`) et la clé métier. Un petit `record` fait une très bonne clé de `Map`.

## Hint 3
Ne range le résultat qu'après un `call.proceed()` réussi. Avec une `ConcurrentHashMap` et `putIfAbsent`, deux appels qui terminent en même temps renvoient le même résultat, mais les deux auront appelé la banque : c'est la limite d'une idempotence en mémoire, que le module 10 règle en base.
