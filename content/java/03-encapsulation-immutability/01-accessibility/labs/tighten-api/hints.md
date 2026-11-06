## Hint 1
Passe chaque déclaration en revue et demande-toi : un client **hors** du paquetage en a-t-il besoin ? Si non, `private` ; si une autre classe du paquetage en a besoin, package-private.

## Hint 2
Un champ `protected` est aussi visible qu'un champ public pour quiconque étend la classe. Pour `PriceIndex`, une classe imbriquée `private static` de `Catalog`, ou au minimum une classe package-private.

## Hint 3
`public static final List<String> CATEGORIES = List.of("épicerie", "frais", "boissons");`, `products()` renvoie `List.copyOf(...)` ou `Collections.unmodifiableList(...)`, et `rebuildIndexForTests` perd son `public`.
