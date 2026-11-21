## Hint 1
Sépare les deux temps. `register` ne fait que lire : `getAnnotation(Component.class)`, `getDeclaredConstructors()`. Les objets n'apparaissent que dans `getBean` et `start`. Une `Map<String, Object>` des singletons déjà créés suffit pour le cache.

## Hint 2
Pour les cycles, garde l'ensemble ordonné des beans **en cours de création** (`LinkedHashSet`) : si un bean y est déjà quand on veut le créer, le chemin du cycle est la fin de cet ensemble. Pour détruire dans l'ordre inverse, empile les singletons au moment où ils sont créés (`ArrayDeque.push`) : un bean est empilé après ses dépendances.

## Hint 3
`java.beans.Introspector.decapitalize` donne exactement le nom à la Spring. `constructor.setAccessible(true)` puis `newInstance(args)` ; une exception du constructeur arrive enveloppée dans une `InvocationTargetException` (`getCause()`). Dans `start()`, entoure la boucle d'un `try/catch` qui appelle `close()` puis relance.
