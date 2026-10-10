package lab

import (
	"slices"
	"testing"
)

func cloneOrders(orders []Order) []Order {
	out := make([]Order, len(orders))
	for i, o := range orders {
		out[i] = Order{ID: o.ID, Lines: slices.Clone(o.Lines)}
	}
	return out
}

func equalOrders(a, b []Order) bool {
	return slices.EqualFunc(a, b, func(x, y Order) bool {
		return x.ID == y.ID && slices.Equal(x.Lines, y.Lines)
	})
}

func TestFulfillBasic(t *testing.T) {
	stock := []Item{{"pull", 2}, {"bonnet", 1}}
	orders := []Order{
		{ID: "A", Lines: []Line{{"pull", 1}}},
		{ID: "B", Lines: []Line{{"pull", 1}, {"bonnet", 2}}},
		{ID: "C", Lines: []Line{{"bonnet", 1}}},
	}
	res := Fulfill(stock, orders)
	if !slices.Equal(res.Shipped, []string{"A", "C"}) {
		t.Errorf("Shipped = %v, attendu [A C]", res.Shipped)
	}
	if !slices.Equal(res.Backordered, []string{"B"}) {
		t.Errorf("Backordered = %v, attendu [B]", res.Backordered)
	}
	if !slices.Equal(res.Remaining, []Item{{"pull", 1}}) {
		t.Errorf("Remaining = %v, attendu [{pull 1}] (les SKU à 0 disparaissent)", res.Remaining)
	}
}

func TestAllOrNothingConsumesNothing(t *testing.T) {
	stock := []Item{{"x", 1}, {"y", 0}}
	orders := []Order{
		{ID: "1", Lines: []Line{{"x", 1}, {"y", 1}}}, // impossible : y manque
		{ID: "2", Lines: []Line{{"x", 1}}},           // doit encore trouver x
	}
	res := Fulfill(stock, orders)
	if !slices.Equal(res.Shipped, []string{"2"}) || !slices.Equal(res.Backordered, []string{"1"}) {
		t.Errorf("une commande en attente ne doit rien consommer : %+v", res)
	}
}

func TestDuplicateSKUsAreSummed(t *testing.T) {
	stock := []Item{{"tasse", 1}, {"tasse", 1}}
	orders := []Order{
		{ID: "doublon", Lines: []Line{{"tasse", 1}, {"tasse", 1}}},
		{ID: "trop", Lines: []Line{{"tasse", 1}}},
	}
	res := Fulfill(stock, orders)
	if !slices.Equal(res.Shipped, []string{"doublon"}) || !slices.Equal(res.Backordered, []string{"trop"}) {
		t.Errorf("les SKU en double s'additionnent (stock et lignes) : %+v", res)
	}
}

func TestEmptyOrderShips(t *testing.T) {
	res := Fulfill(nil, []Order{{ID: "vide"}})
	if !slices.Equal(res.Shipped, []string{"vide"}) {
		t.Errorf("une commande sans ligne est expédiée : %+v", res)
	}
}

func TestUnknownSKUIsBackordered(t *testing.T) {
	res := Fulfill([]Item{{"a", 5}}, []Order{{ID: "z", Lines: []Line{{"inconnu", 1}}}})
	if !slices.Equal(res.Backordered, []string{"z"}) {
		t.Errorf("un SKU absent du stock met la commande en attente : %+v", res)
	}
}

func TestRemainingSorted(t *testing.T) {
	stock := []Item{{"zèbre", 1}, {"abricot", 2}, {"mangue", 3}}
	res := Fulfill(stock, nil)
	want := []Item{{"abricot", 2}, {"mangue", 3}, {"zèbre", 1}}
	for i := 0; i < 10; i++ {
		if got := Fulfill(stock, nil).Remaining; !slices.Equal(got, want) {
			t.Fatalf("Remaining = %v, attendu %v (trié par SKU)", got, want)
		}
	}
	_ = res
}

func TestInputsNotModified(t *testing.T) {
	stock := []Item{{"a", 3}, {"b", 1}}
	orders := []Order{{ID: "1", Lines: []Line{{"a", 2}}}, {ID: "2", Lines: []Line{{"b", 5}}}}
	stockBefore := slices.Clone(stock)
	ordersBefore := cloneOrders(orders)
	Fulfill(stock, orders)
	if !slices.Equal(stock, stockBefore) {
		t.Errorf("stock a été modifié : %v, attendu %v", stock, stockBefore)
	}
	if !equalOrders(orders, ordersBefore) {
		t.Errorf("orders a été modifié : %v", orders)
	}
}

func TestEmptyResultsHaveLengthZero(t *testing.T) {
	res := Fulfill(nil, nil)
	if res.Shipped == nil || res.Backordered == nil || res.Remaining == nil {
		t.Errorf("les champs vides doivent être des slices de longueur 0, pas nil : %#v", res)
	}
}
