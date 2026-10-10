package lab

// Item est une quantité en stock pour un SKU.
type Item struct {
	SKU string
	Qty int
}

// Line est une ligne de commande.
type Line struct {
	SKU string
	Qty int
}

// Order est une commande composée de lignes.
type Order struct {
	ID    string
	Lines []Line
}

// Result décrit l'issue du traitement des commandes.
type Result struct {
	Shipped     []string
	Backordered []string
	Remaining   []Item
}

// Fulfill traite les commandes dans l'ordre, en tout ou rien.
// Voir instructions.md pour les règles complètes.
func Fulfill(stock []Item, orders []Order) Result {
	// TODO
	return Result{}
}
