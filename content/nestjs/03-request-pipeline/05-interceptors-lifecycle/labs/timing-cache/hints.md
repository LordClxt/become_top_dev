## Hint 1
`next.handle()` renvoie le flux de la réponse. Ce qui est avant cet appel s'exécute avant le handler, ce qui est dans `.pipe(...)` s'exécute après.

## Hint 2
`tap(fn)` n'est pas appelé quand le handler lève une erreur. `tap({ next, error })` couvre les deux issues. Pour la route : `context.getClass().name` et `context.getHandler().name`.

## Hint 3
Cache : `CacheTtl = Reflector.createDecorator<number>()`, `reflector.get(CacheTtl, context.getHandler())`. Si l'entrée est valide, `return of(valeur)` sans appeler `next.handle()` ; sinon `next.handle().pipe(tap((v) => stocker(v)))`.
