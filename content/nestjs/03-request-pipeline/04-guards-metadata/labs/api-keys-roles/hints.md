## Hint 1
`Reflector.createDecorator<string[]>()` crée un décorateur typé et la clé pour le relire. Pour lire « méthode d'abord, sinon classe » : `reflector.getAllAndOverride(Roles, [context.getHandler(), context.getClass()])`.

## Hint 2
Un guard qui renvoie `false` produit un 403. Pour un 401, **lève** `UnauthorizedException`. `createParamDecorator((field, ctx) => …)` reçoit l'argument passé au décorateur.

## Hint 3
`Public` : `Reflector.createDecorator<boolean>({ transform: () => true })` permet d'écrire `@Public()` sans argument. `Auth` : `applyDecorators(Roles(roles))`.
