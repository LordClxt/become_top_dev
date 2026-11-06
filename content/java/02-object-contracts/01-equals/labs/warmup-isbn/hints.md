## Hint 1
La signature doit être exactement `public boolean equals(Object o)`, avec `@Override` au-dessus. Avec un paramètre de type `Isbn`, tu surchargerais au lieu de redéfinir.

## Hint 2
`instanceof` renvoie `false` pour `null` : pas besoin de tester `o == null` à part.

## Hint 3
`return o == this || (o instanceof Isbn other && other.digits.equals(digits));`
