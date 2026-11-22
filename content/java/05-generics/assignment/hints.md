## Hint 1
Une `Function<A, B>` **consomme** des `A` et **produit** des `B`. Dans `map(Function<T, R> f)`, f consomme les `T` du résultat et produit les `R` du nouveau. Qu'en dit PECS ?

## Hint 2
`Function<? super T, ? extends R>`, `Supplier<? extends T>`, `Consumer<? super T>`. Pour `flatMap`, la fonction produit un `Result` d'un sous-type de `R` : `? extends Result<? extends R>`. Le corps doit alors reconstruire un `Result<R>` à partir de la valeur, sans cast.

## Hint 3
Dans `flatMap` : `Result<? extends R> next = f.apply(value); return next.isOk() ? ok(next.value) : err(next.error);` (`next.value` est lu comme un `R`, c'est permis). `sequence(List<? extends Result<? extends T>> results)` et une boucle sur `Result<? extends T>`.
