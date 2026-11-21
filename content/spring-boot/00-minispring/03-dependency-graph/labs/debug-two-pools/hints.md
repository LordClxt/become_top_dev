## Hint 1
Ajoute un `System.out.println` dans `Factory.create` avec le nom du bean, puis lance un test : compte combien de fois `connectionPool` passe par là, et d'où vient chaque appel (`Thread.dumpStack()` aide).

## Hint 2
Un singleton n'est unique que si **toute** création passe par le cache. Regarde ce que fait `Resolver` pour obtenir une dépendance, et sous quelle clé `getBean(Class)` cherche dans le cache, comparée à celle sous laquelle il range.

## Hint 3
`Resolver` doit demander la dépendance au conteneur (`container.getBean(nom)`), jamais à la fabrique. `getBean(Class)` doit se ramener à `getBean(nom)`. Attention à `computeIfAbsent` : la création d'un bean appelle `getBean` pour ses dépendances, donc modifie la même map pendant le calcul.
