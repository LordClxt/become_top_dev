## Hint 1
`@Catch()` sans argument attrape tout. Un filtre enregistré par `APP_FILTER` est un provider : il peut recevoir `HttpAdapterHost` par son constructeur.

## Hint 2
`exception.getResponse()` renvoie soit une chaîne, soit un objet `{ message, statusCode, errorCode? }`. `HttpStatus[404]` vaut `'NOT_FOUND'`.

## Hint 3
`const { httpAdapter } = this.adapterHost;` puis `httpAdapter.reply(ctx.getResponse(), body, status)` et `httpAdapter.getRequestUrl(ctx.getRequest())` pour le chemin.
