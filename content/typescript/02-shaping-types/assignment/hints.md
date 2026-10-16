## Hint 1
`Omit<Item, 'sku'>` retire une clé ; `Partial<…>` rend le reste optionnel. `ReadonlyMap<K, V>` est le type d'une Map qu'on ne peut que lire.

## Hint 2
Pour renvoyer un nouvel inventaire : `new Map(inventory)` copie la Map (elle accepte un `ReadonlyMap`), puis `.set(...)` sur la copie.

## Hint 3
`withoutEmpty` : `export const withoutEmpty: Transform = (inventory) => new Map([...inventory].filter(([, item]) => item.qty > 0))`. `compose` : `reduce` sur le tableau des transformations, avec l'inventaire de départ comme valeur initiale.
