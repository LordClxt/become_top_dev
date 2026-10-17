## Hint 1
M1 : `CatalogModule` exporte déjà `BooksService`. Il suffit que `OrdersModule` l'importe. Pour le générateur, reprends la recette du TP « module d'identifiants » : `new ConfigurableModuleBuilder<IdGeneratorOptions>().build()`, puis `@Inject(MODULE_OPTIONS_TOKEN)` dans `IdGenerator`.

## Hint 2
M2 : `.setClassMethodName('forRoot')` pour obtenir `forRoot()`, et `.setExtras({ isGlobal: false }, (def, extras) => ({ ...def, global: extras.isGlobal }))` pour l'option globale.

## Hint 3
M3 : `RequestContext` en `Scope.REQUEST` avec `@Inject(REQUEST)`. `OrdersService` en dépend : il devient request-scoped, et c'est voulu. Garde les commandes dans un `OrdersRepository` singleton, que `OrdersService` reçoit en injection : lui ne dépend pas de la requête, il reste unique.
