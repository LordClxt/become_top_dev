## Hint 1
Il faut deux pièces : une **métadonnée** (le nom de l'action, posé sur la méthode) et un **intercepteur** qui la lit. Un seul décorateur peut poser les deux.

## Hint 2
`applyDecorators(MaMetadonnee(action), UseInterceptors(AuditInterceptor))`. L'intercepteur, enregistré par `@UseInterceptors(Classe)`, est construit par Nest : il peut recevoir `Reflector`, `AuditLog` et `RequestContext`.

## Hint 3
`next.handle().pipe(tap({ next: () => …success, error: (err) => …failure }))` : `tap` observe l'erreur sans la remplacer. Ne fais surtout pas `catchError` qui renverrait autre chose.
