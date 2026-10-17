## Hint 1
`xs.at(i)` accepte les indices négatifs (en partant de la fin) : teste plutôt `i >= 0 && i < xs.length`.

## Hint 2
`interface Feeder { feed: (animal: Animal) => string }` : avec la syntaxe propriété, un `(animal: Hen) => string` n'est plus assignable.

## Hint 3
`const { author } = fact;` avant d'appeler `beforePrint(fact)`.
