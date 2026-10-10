## Contexte

Black Friday. L'entrepôt reçoit des centaines de commandes. Ton programme décide lesquelles partent maintenant et lesquelles attendent un réassort.

Tu as 45 minutes. Tout le module y passe : slices, maps, structs, et le piège de la mémoire partagée.

## Les types (déjà dans `warehouse.go`)

```go
type Item  struct { SKU string; Qty int }
type Line  struct { SKU string; Qty int }
type Order struct { ID string; Lines []Line }

type Result struct {
	Shipped     []string // IDs des commandes expédiées, dans l'ordre de traitement
	Backordered []string // IDs des commandes en attente, dans l'ordre de traitement
	Remaining   []Item   // stock restant
}
```

## Ta mission

```go
func Fulfill(stock []Item, orders []Order) Result
```

## Règles

1. Les commandes sont traitées **dans l'ordre**.
2. **Tout ou rien** : une commande part seulement si **toutes** ses lignes peuvent être servies avec le stock actuel. Sinon elle est mise en attente et ne consomme rien.
3. Une commande peut contenir plusieurs lignes pour le même SKU : leurs quantités s'additionnent.
4. Le stock initial peut contenir plusieurs fois le même SKU : les quantités s'additionnent.
5. Une commande sans ligne est expédiée.
6. `Remaining` : un `Item` par SKU dont la quantité restante est **> 0**, trié par SKU.
7. **`stock` et `orders` ne doivent pas être modifiés.** Ils servent encore ailleurs dans l'application.
8. `Shipped`, `Backordered` et `Remaining` sont des slices **vides mais non nil** (`[]string{}`) quand il n'y a rien : le résultat part en JSON vers le tableau de bord, qui attend `[]` et pas `null`.
