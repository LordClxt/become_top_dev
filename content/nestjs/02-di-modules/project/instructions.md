## Librairie, jalon 2

Tu repars du jalon 1 : le catalogue versionné, `createApp()`, et un `SEED` qui gagne un champ `priceCents`. Tout se passe encore dans `app.ts`. Les tests passent toujours par `createApp()`.

## M1 — Le module des commandes

Crée un `OrdersModule` séparé :

| Requête | Succès | Erreurs |
|---|---|---|
| `POST /api/v1/orders` (corps `{ isbn, quantity }`) | 201 + `Location: /api/v1/orders/<id>` | 400 (schéma `CreateOrder`), 422 (livre inconnu) |
| `GET /api/v1/orders/:id` | 200 | 404 |

- `OrdersService` lit les livres avec le `BooksService` **exporté** par `CatalogModule`. Ne le redéclare pas : une commande sur un livre tout juste créé par `POST /books` doit fonctionner.
- Les identifiants viennent d'un `IdGeneratorModule.register({ prefix: 'ord' })` construit avec `ConfigurableModuleBuilder` : `ord_1`, `ord_2`…

## M2 — Des prix configurés une fois

`PricingModule.forRoot({ vatRate: 0.055, isGlobal: true })` est importé **une seule fois**, dans `AppModule`. `PricingService.total(prix, quantité)` renvoie le total TTC en centimes, arrondi. `OrdersModule` ne l'importe pas.

## M3 — La trace de la requête

Chaque commande enregistre `requestId` : l'en-tête `x-request-id`, sinon `req_<n>`. Les requêtes parallèles ne doivent pas se mélanger.

Attention à la contagion des portées : si un provider qui garde de l'état (les commandes, le compteur d'identifiants) devient « par requête », il repart de zéro à chaque appel. Dans la revue, explique quels providers deviennent request-scoped dans ton graphe, et pourquoi c'est acceptable ici.
