## Contexte

Un client commande deux exemplaires de *Germinal*, mais le catalogue affiche toujours trois exemplaires en stock. Les services (fournis, dans `services.ts`) sont corrects : le problème est dans le graphe des modules (`modules.ts`).

## Ce qui est attendu

- Une **seule** instance de `StockService` dans toute l'application : une commande doit diminuer le stock vu par le catalogue.
- `CatalogModule` expose `StockService` ; `PriceService` reste un détail interne, qu'aucun autre module ne peut injecter.
- `CoreModule` rend le catalogue disponible à qui l'importe. `OrdersModule` importe `CoreModule`, pas `CatalogModule` directement.
- Pas de `@Global()` : la dépendance doit rester visible dans les `imports`.

Tu ne modifies que `modules.ts`.
