package lab

import (
	"slices"
	"strings"
)

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
	available := make(map[string]int, len(stock))
	for _, it := range stock {
		available[it.SKU] += it.Qty
	}

	res := Result{Shipped: []string{}, Backordered: []string{}}
	for _, o := range orders {
		need := neededBySKU(o.Lines)
		if !covers(available, need) {
			res.Backordered = append(res.Backordered, o.ID)
			continue
		}
		for sku, qty := range need {
			available[sku] -= qty
		}
		res.Shipped = append(res.Shipped, o.ID)
	}

	res.Remaining = remaining(available)
	return res
}

func neededBySKU(lines []Line) map[string]int {
	need := make(map[string]int, len(lines))
	for _, l := range lines {
		need[l.SKU] += l.Qty
	}
	return need
}

func covers(available, need map[string]int) bool {
	for sku, qty := range need {
		if available[sku] < qty {
			return false
		}
	}
	return true
}

func remaining(available map[string]int) []Item {
	out := make([]Item, 0, len(available))
	for sku, qty := range available {
		if qty > 0 {
			out = append(out, Item{SKU: sku, Qty: qty})
		}
	}
	slices.SortFunc(out, func(a, b Item) int { return strings.Compare(a.SKU, b.SKU) })
	return out
}
