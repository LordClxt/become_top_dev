## Hint 1
Un middleware qui ne termine pas la réponse doit appeler `next()`, sinon la requête reste pendante.

## Hint 2
`consumer.apply(shopHeader).forRoutes(BooksController)` dans `configure()`.
