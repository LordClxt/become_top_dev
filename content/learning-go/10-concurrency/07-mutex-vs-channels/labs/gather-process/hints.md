## Hint 1
`Gather` : dérive `ctx, cancel := context.WithCancel(ctx)` ; lance chaque fonction dans une goroutine qui écrit son résultat dans un channel de **capacité 1** (elle ne bloquera jamais).

## Hint 2
Reçois les deux résultats avec un `for i := 0; i < 2; i++ { select { case r := <-ca: ... case r := <-cb: ... } }`. À la première erreur, mémorise-la et appelle `cancel()` pour réveiller l'autre.

## Hint 3
`GatherAndProcess` : `ctx, cancel := context.WithTimeout(ctx, limit)` + `defer cancel()`, puis `Gather`. Si `Gather` renvoie une erreur, renvoie-la ; sinon appelle `fc`. Pense à vérifier `ctx.Err()` avant d'appeler `fc`.
