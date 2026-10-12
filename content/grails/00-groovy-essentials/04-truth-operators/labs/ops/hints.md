## Hint 1
`Money` : déclare `class Money implements Comparable<Money>` avec `@EqualsAndHashCode`. `plus`, `minus`, `multiply`, `negative`, `compareTo` et `asBoolean` sont de simples méthodes ; Groovy les appelle pour `+`, `-`, `*`, `-x`, `<` et `if (m)`.

## Hint 2
Pour arrondir sans `double` : `(cents * (n as BigDecimal)).setScale(0, RoundingMode.HALF_UP).longValue()` (importe `java.math.RoundingMode`). Pour `of`, `new BigDecimal(text)` multiplié par 100 puis `longValueExact()` ou `setScale`.

## Hint 3
Dans `classify`, l'ordre des `case` compte : le premier qui correspond gagne. Un `case` accepte une classe (`case Number`), un Pattern (`case ~/\d+/`), et une closure (`case { it instanceof Integer && it in 0..9 }`). Pour les accès sécurisés : `person?.address?.city ?: 'inconnue'`, et `values.find { it?.trim() }`.
