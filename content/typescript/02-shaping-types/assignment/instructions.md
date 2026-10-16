## Contexte

Tu écris un petit inventaire **immuable** : les fonctions ne modifient jamais ce qu'on leur donne, elles renvoient un nouvel état. Tout ce chapitre y passe : une signature de fonction nommée, `readonly` pour interdire les mutations, des types **dérivés** (`Omit`, `Partial`, `ReadonlyMap`) plutôt que recopiés, une `Map` pour les clés dynamiques.

Tu édites `inventory.ts`.

## À faire

1. `Item.sku` est en lecture seule.
2. `Inventory` = `ReadonlyMap<string, Readonly<Item>>`. `ItemPatch` : tous les champs d'`Item` optionnels **sauf** `sku`. `Transform` : `(inventory) => Inventory`.
3. `addItem` (copie l'article ; sku en double → `Error`), `applyPatch` (sku inconnu → `Error`), `totalValue` (arrondi au centime), `lowStock(inventory, seuil)` (qty **strictement** inférieure, triés par sku).
4. `withoutEmpty` : une `const` de type `Transform` qui retire les articles de quantité `0`. `compose(...transforms)` applique de gauche à droite (sans argument : l'identité).

## Contraintes

Aucun `any`, aucune mutation des arguments. Les tests de types refusent `inv.set(...)` et le patch du `sku`.
