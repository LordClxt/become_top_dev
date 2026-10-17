## Hint 1
Déclarer `StockService` dans les `providers` de deux modules crée deux instances, chacune avec son propre stock.

## Hint 2
Ce qu'un module **exporte** forme son API publique. Ici, le catalogue exporte la mauvaise chose.

## Hint 3
`@Module({ imports: [CatalogModule], exports: [CatalogModule] }) class CoreModule {}` ré-exporte le catalogue. Ensuite `OrdersModule` importe `CoreModule` et ne garde que `OrdersService` dans ses `providers`.
