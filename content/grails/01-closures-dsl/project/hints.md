## Hint 1
Pour trouver la closure : `Class type = instance.getClass(); type.metaClass.hasProperty(type, 'constraints')` te dit si elle existe, et `type.constraints` la renvoie (un champ `static` se lit comme une propriété de la classe). Les propriétés de l'instance sont dans `instance.properties` (retire `class` et `metaClass`).

## Hint 2
Dans `Validator.build`, remplace `spec.delegate = …` par une copie : `Closure copy = spec.rehydrate(builder, spec.owner, spec.thisObject)`, puis règle `copy.resolveStrategy = Closure.DELEGATE_FIRST` et appelle `copy()`. L'originale reste intacte.

## Hint 3
Pour le jalon 2, ajoute `'validator'` à la liste des contraintes connues (le builder la refuse sinon). Dans `validate`, appelle la closure selon `c.maximumNumberOfParameters` : 1 → `c(value)`, 2 → `c(value, obj)`, 3 → `c(value, obj, found)` avec `found` une liste que tu ajoutes ensuite aux erreurs. Pour les arités 1 et 2, interprète le retour : `null` ou `true` → rien ; `CharSequence` → ce code ; sinon `"champ.validator"`.
