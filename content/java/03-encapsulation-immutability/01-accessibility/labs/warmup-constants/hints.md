## Hint 1
Le tableau devient `private static final String[] PRIVATE_CODES`. Ce qui est public doit être soit immuable, soit une copie.

## Hint 2
`List.of(...)` produit une liste non modifiable ; `tableau.clone()` produit une copie.

## Hint 3
`public static final List<String> CODES = List.of(PRIVATE_CODES);` et `return PRIVATE_CODES.clone();`.
