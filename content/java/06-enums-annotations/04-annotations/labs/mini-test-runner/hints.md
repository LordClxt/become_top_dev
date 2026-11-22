## Hint 1
Zéro vérification lancée : que voit la réflexion d'une annotation déclarée sans `@Retention` ? Les `@ExpectThrows` qui échouent toujours : quelle exception compare-t-on, celle de la méthode ou son enveloppe ?

## Hint 2
`@Retention(RetentionPolicy.RUNTIME)` sur `@Check`. Une exception levée par la méthode appelée arrive dans une `InvocationTargetException` : c'est `getCause()` qu'il faut comparer aux types attendus. Une méthode d'instance appelée avec `invoke(null)` lève une `NullPointerException` qui n'est pas un échec du test : vérifie `Modifier.isStatic` et `getParameterCount()` avant d'appeler.

## Hint 3
Trie `getDeclaredMethods()` par nom (`Comparator.comparing(Method::getName)`) : son ordre n'est pas garanti. Une petite méthode `Throwable invoke(Method m)` qui renvoie la cause déballée (ou `null`) simplifie les deux branches. Les méthodes de démonstration ne sont pas publiques : `m.setAccessible(true)`.
