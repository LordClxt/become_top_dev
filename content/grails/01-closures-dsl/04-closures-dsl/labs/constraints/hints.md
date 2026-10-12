## Hint 1
Écris une classe `RuleBuilder` (interne ou voisine) avec `def methodMissing(String field, Object args)`. `args` est un tableau : la Map des contraintes est `args[0]`. Stocke-la dans une `Map` indexée par le nom du champ (une `LinkedHashMap` garde l'ordre de déclaration).

## Hint 2
Dans `build`, fabrique le builder, puis `spec.delegate = builder`, `spec.resolveStrategy = Closure.DELEGATE_FIRST`, `spec()`. Pense à passer au validateur la map de règles que le builder a remplie.

## Hint 3
Pour `validate`, parcours `rules.each { field, constraints -> … }`. Traite d'abord `value == null` (nullable). Ensuite une liste d'ordre `['nullable','blank','size','range','inList','matches']` te donne l'ordre des tests ; pour `size` et `range` et `inList`, l'opérateur `in` marche avec un intervalle ou une liste : `value in expected`. Pour `matches`, utilise `==~`.

Attention aux GStrings : `"$field.nullable"` lit la *propriété* `nullable` de `field` (et lève une erreur). Pour obtenir le texte `age.nullable`, écris `"${field}.nullable"`.
