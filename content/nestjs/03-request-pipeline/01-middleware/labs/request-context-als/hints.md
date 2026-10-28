## Hint 1
`new AsyncLocalStorage<RequestStore>()` dans `RequestContext`, puis `als.run(store, fn)` et `als.getStore()`.

## Hint 2
Le middleware est une classe `@Injectable()` : il peut recevoir `RequestContext` par son constructeur.

## Hint 3
La « suite de la requête », c'est `next`. `this.ctx.run({ requestId }, next)` : tout ce qui s'exécute après, même après des `await`, voit ce contexte.
