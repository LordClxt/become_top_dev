## Hint 1
Le code de statut par défaut de POST est déjà 201. Pour DELETE, il faut le décorateur qui change le statut. Pour 404 et 409, ne renvoie rien de spécial : lève l'exception adaptée.

## Hint 2
`@Res({ passthrough: true }) res: Response` (le type `Response` vient d'`express`) te donne `res.location(...)` ; tu continues ensuite à **renvoyer** le livre normalement.

## Hint 3
`@Delete(':isbn') @HttpCode(204) remove(@Param('isbn') isbn: string): void { if (!this.books.remove(isbn)) throw new NotFoundException(...) }`. Pour `PUT`, `this.books.update(isbn, body.title)` renvoie `undefined` si le livre n'existe pas.
