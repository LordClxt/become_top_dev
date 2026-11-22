## Hint 1
Un enum est une classe : il peut avoir des champs et un constructeur. Si chaque constante passe son code au constructeur, une constante sans code ne compile plus.

## Hint 2
`NEW("N", false), …, REJECTED("R", true);` avec deux champs `final`. Pour `fromCode`, une table code → statut, construite **après** les constantes (un constructeur d'enum ne peut pas remplir un champ `static`).

## Hint 3
`private static final Map<String, OrderStatus> BY_CODE = Stream.of(values()).collect(Collectors.toUnmodifiableMap(OrderStatus::code, Function.identity()));` puis `return Optional.ofNullable(BY_CODE.get(code));`.
