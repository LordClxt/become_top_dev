## Hint 1
Une clause par classe : symétrie (`CaseInsensitiveString`), substitution de Liskov (`Point`), symétrie + transitivité avec une sous-classe qui ajoute une valeur (`ColorPoint`), réflexivité et redéfinition (`Measurement`).

## Hint 2
`Point` : `instanceof` au lieu de `getClass()`. `ColorPoint` : un champ `private final Point point`, et `equals` qui ne reconnaît que les `ColorPoint`. `Measurement` : regarde le type du paramètre de son `equals`, et ce que vaut `NaN == NaN`.

## Hint 3
`Measurement.equals` doit prendre un `Object` et porter `@Override` ; compare `value` avec `Double.compare(a, b) == 0` et `sensor` avec `Objects.equals`. Son `hashCode` doit alors utiliser `Double.hashCode(value)` et `Objects.hashCode(sensor)` pour rester cohérent.
