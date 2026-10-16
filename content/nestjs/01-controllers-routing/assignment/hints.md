## Hint 1
Chaque ligne du tableau est une validation à la frontière : un pipe pour l'UUID, un pipe d'énumération optionnel pour `status`, un schéma Zod pour le corps. Les règles qui dépendent de l'état de la commande sont dans le service, qui lève des erreurs métier : traduis-les en exceptions HTTP.

## Hint 2
`ParseUUIDPipe` pour `:id` ; `new ParseEnumPipe(OrderStatus, { optional: true })` pour `status` ; `@Header('Cache-Control', 'no-store')` (valeur fixe, donc le décorateur convient) ; `@Res({ passthrough: true })` pour `Location`. `@HttpCode(200)` sur `cancel`, car c'est un POST.

## Hint 3
`OrdersService.cancel` lève `OrderNotFoundError` ou `OrderShippedError`. Attrape-les dans le contrôleur et lève `NotFoundException` ou `ConflictException`, puis relance toute autre erreur. Schéma : `z.object({ items: z.array(z.object({ isbn: z.string().regex(…), qty: z.number().int().min(1).max(10) })).min(1).max(20) })`.
