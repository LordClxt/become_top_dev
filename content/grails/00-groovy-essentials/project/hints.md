## Hint 1
Pour `convert`, un `switch (type)` sur la classe cible : `case [Integer, int]` utilise `isCase` d'une liste, donc les deux classes sont acceptées. `'36' as Integer` lève `NumberFormatException` si le texte n'est pas un nombre : attrape-la et relance une `IllegalArgumentException`.

## Hint 2
`target.metaClass.properties` renvoie des `MetaProperty` avec `name`, `type` et `modifiers`. `java.lang.reflect.Modifier.isStatic(p.modifiers)` détecte les statiques ; une propriété `def` a le type `Object`. Garde celles qui ont un setter : `p instanceof MetaBeanProperty && p.setter`. `type.isPrimitive()` te dit si `null` est interdit.

## Hint 3
Pour écrire une propriété dont le nom est dans une variable : `target."$name" = value` (ou `target[name] = value`). Pour le jalon 3, filtre la liste des noms : `(!include || name in include) && !(name in exclude)` avec `include = opts.include ?: []` et `exclude = opts.exclude ?: []`.
