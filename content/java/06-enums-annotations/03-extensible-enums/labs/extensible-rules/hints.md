## Hint 1
Un enum ne s'étend pas, mais il peut implémenter une interface : `public enum RiskRule implements OrderRule`, avec un corps par constante.

## Hint 2
Pour recevoir un enum entier **et** l'utiliser comme `OrderRule`, une borne d'intersection : `<T extends Enum<T> & OrderRule> List<String> checkAll(Order order, Class<T> rules)`. Pour mélanger plusieurs enums : `Collection<? extends OrderRule>`.

## Hint 3
`failing` : `<T extends Enum<T> & OrderRule> Set<T> failing(Order order, Class<T> rules)`, avec `EnumSet.noneOf(rules)` rempli en parcourant `rules.getEnumConstants()`.
