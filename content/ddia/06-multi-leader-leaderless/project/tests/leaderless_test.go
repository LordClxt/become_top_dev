package lab

import (
	"errors"
	"reflect"
	"testing"
)

// ---------- Jalon 1 ----------

func TestM1Compare(t *testing.T) {
	cases := []struct {
		name string
		a, b VV
		want Order
	}{
		{"égaux", VV{"A": 1, "B": 2}, VV{"A": 1, "B": 2}, Equal},
		{"vides", VV{}, nil, Equal},
		{"avant", VV{"A": 1}, VV{"A": 2, "B": 1}, Before},
		{"après", VV{"A": 3, "B": 1}, VV{"A": 2, "B": 1}, After},
		{"concurrents", VV{"A": 2}, VV{"B": 1}, Concurrent},
		{"concurrents croisés", VV{"A": 2, "B": 1}, VV{"A": 1, "B": 2}, Concurrent},
		{"compteur absent = 0", VV{}, VV{"A": 1}, Before},
		{"absent des deux côtés", VV{"A": 1, "B": 0}, VV{"A": 1}, Equal},
	}
	for _, c := range cases {
		if got := Compare(c.a, c.b); got != c.want {
			t.Errorf("%s : Compare(%v, %v) = %v, attendu %v", c.name, c.a, c.b, got, c.want)
		}
	}
}

func TestM1CompareIsAntisymmetric(t *testing.T) {
	a, b := VV{"A": 1}, VV{"A": 2}
	if Compare(a, b) != Before || Compare(b, a) != After {
		t.Fatal("Compare(a,b)=Before implique Compare(b,a)=After")
	}
}

func TestM1IncReturnsACopy(t *testing.T) {
	v := VV{"A": 1}
	w := v.Inc("A").Inc("B")
	if v["A"] != 1 || len(v) != 1 {
		t.Fatalf("Inc ne doit pas modifier le vecteur d'origine : %v", v)
	}
	if w["A"] != 2 || w["B"] != 1 {
		t.Fatalf("Inc = %v, attendu A=2 B=1", w)
	}
}

func TestM1MergeLaws(t *testing.T) {
	a, b, c := VV{"A": 3, "B": 1}, VV{"A": 1, "B": 4, "C": 2}, VV{"C": 5}
	if got := Merge(a, b); !reflect.DeepEqual(got, VV{"A": 3, "B": 4, "C": 2}) {
		t.Fatalf("Merge = %v, attendu le max compteur par compteur", got)
	}
	if !reflect.DeepEqual(Merge(a, b), Merge(b, a)) {
		t.Error("Merge doit être commutatif")
	}
	if !reflect.DeepEqual(Merge(Merge(a, b), c), Merge(a, Merge(b, c))) {
		t.Error("Merge doit être associatif")
	}
	if !reflect.DeepEqual(Merge(a, a), a) {
		t.Error("Merge doit être idempotent")
	}
	m := Merge(a, b)
	m["A"] = 99
	if a["A"] != 3 {
		t.Error("Merge doit renvoyer une nouvelle map")
	}
}

func TestM1GCounterConverges(t *testing.T) {
	// trois réplicas incrémentent indépendamment, puis échangent leur état dans des ordres différents
	r1 := VV{}.Inc("r1").Inc("r1")
	r2 := VV{}.Inc("r2")
	r3 := VV{}.Inc("r3").Inc("r3").Inc("r3")
	x := Merge(Merge(r1, r2), r3)
	y := Merge(r3, Merge(r2, Merge(r1, r2)))
	if x.Sum() != 6 || y.Sum() != 6 {
		t.Fatalf("sommes %d et %d, attendu 6 (les réplicas convergent sur la même valeur)", x.Sum(), y.Sum())
	}
	if got := Merge(x, x).Sum(); got != 6 {
		t.Fatalf("fusionner deux fois le même état ne doit rien changer : %d", got)
	}
}

// ---------- Jalon 2 : le panier de la figure 5-13 ----------

func TestM2ShoppingCartScenario(t *testing.T) {
	s := NewStore()
	// 1. le client 1 ajoute du lait : première écriture, version 1
	vals, v := s.Put("cart", "[milk]", 0)
	if v != 1 || !reflect.DeepEqual(vals, []string{"[milk]"}) {
		t.Fatalf("étape 1 : %v v%d", vals, v)
	}
	// 2. le client 2 ajoute des œufs sans avoir rien lu : écriture concurrente
	vals, v = s.Put("cart", "[eggs]", 0)
	if v != 2 || !reflect.DeepEqual(vals, []string{"[milk]", "[eggs]"}) {
		t.Fatalf("étape 2 : %v v%d (le lait doit rester : l'écriture est concurrente)", vals, v)
	}
	// 3. le client 1 envoie [milk, flour] avec la version 1 : il écrase [milk] mais pas [eggs]
	vals, v = s.Put("cart", "[milk,flour]", 1)
	if v != 3 || !reflect.DeepEqual(vals, []string{"[eggs]", "[milk,flour]"}) {
		t.Fatalf("étape 3 : %v v%d", vals, v)
	}
	// 4. le client 2 fusionne [milk] et [eggs], ajoute du jambon, envoie avec la version 2
	vals, v = s.Put("cart", "[eggs,milk,ham]", 2)
	if v != 4 || !reflect.DeepEqual(vals, []string{"[milk,flour]", "[eggs,milk,ham]"}) {
		t.Fatalf("étape 4 : %v v%d", vals, v)
	}
	// 5. le client 1 fusionne ce qu'il a reçu à la version 3 et ajoute du bacon
	vals, v = s.Put("cart", "[milk,flour,eggs,bacon]", 3)
	if v != 5 || !reflect.DeepEqual(vals, []string{"[eggs,milk,ham]", "[milk,flour,eggs,bacon]"}) {
		t.Fatalf("étape 5 : %v v%d", vals, v)
	}
	if got, ver := s.Get("cart"); ver != 5 || len(got) != 2 {
		t.Fatalf("Get = %v v%d ; deux siblings attendus", got, ver)
	}
}

func TestM2MergingWithLatestVersionLeavesOneValue(t *testing.T) {
	s := NewStore()
	s.Put("k", "a", 0)
	s.Put("k", "b", 0)
	vals, v := s.Get("k")
	if len(vals) != 2 {
		t.Fatalf("deux écritures concurrentes : %v", vals)
	}
	vals, _ = s.Put("k", "a+b", v)
	if !reflect.DeepEqual(vals, []string{"a+b"}) {
		t.Fatalf("après fusion avec la dernière version, il ne doit rester qu'une valeur : %v", vals)
	}
}

func TestM2UnknownKeyAndIndependentKeys(t *testing.T) {
	s := NewStore()
	if vals, v := s.Get("none"); len(vals) != 0 || v != 0 {
		t.Fatalf("clé inconnue : %v v%d", vals, v)
	}
	s.Put("a", "1", 0)
	s.Put("b", "2", 0)
	if _, v := s.Get("a"); v != 1 {
		t.Fatalf("les versions sont par clé : a est à la version %d, attendu 1", v)
	}
}

func TestM2MergeCartsKeepsRemovals(t *testing.T) {
	s1 := []CartItem{{"milk", false}, {"eggs", false}}
	s2 := []CartItem{{"eggs", true}, {"ham", false}} // eggs retiré dans ce sibling
	got := MergeCarts(s1, s2)
	want := []CartItem{{"eggs", true}, {"ham", false}, {"milk", false}}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("MergeCarts = %v, attendu %v (union triée ; une suppression reste une suppression)", got, want)
	}
	if got := MergeCarts(); len(got) != 0 {
		t.Fatalf("aucun panier : %v", got)
	}
}

// ---------- Jalon 3 : le cluster à quorum ----------

func TestM3QuorumCondition(t *testing.T) {
	if !QuorumOverlaps(3, 2, 2) || !QuorumOverlaps(5, 3, 3) || !QuorumOverlaps(3, 3, 1) {
		t.Error("(3,2,2), (5,3,3) et (3,3,1) se recoupent")
	}
	if QuorumOverlaps(3, 1, 1) || QuorumOverlaps(5, 2, 3) {
		t.Error("(3,1,1) et (5,2,3) ne se recoupent pas : w + r <= n")
	}
}

func TestM3WriteToleratesOneDownNode(t *testing.T) {
	c := NewCluster(3, 2, 2)
	c.SetDown(2, true)
	if err := c.Write("k", "v1", 1); err != nil {
		t.Fatalf("2 nœuds sur 3 suffisent pour w=2 : %v", err)
	}
	if c.NodeVersion(2, "k") != 0 {
		t.Fatal("le nœud en panne n'a pas reçu l'écriture")
	}
	c.SetDown(1, true)
	if err := c.Write("k", "v2", 2); !errors.Is(err, ErrQuorum) {
		t.Fatalf("1 nœud sur 3 ne suffit pas pour w=2 : %v", err)
	}
}

func TestM3ReadRepairHealsAStaleNode(t *testing.T) {
	c := NewCluster(3, 2, 2)
	c.SetDown(2, true)
	c.Write("k", "v1", 1)
	c.SetDown(2, false) // le nœud revient, en retard
	v, ver, err := c.Read("k", 1, 2)
	if err != nil || v != "v1" || ver != 1 {
		t.Fatalf("Read(1,2) = %q v%d %v ; le nœud 1 est à jour, la lecture doit renvoyer v1", v, ver, err)
	}
	if c.NodeVersion(2, "k") != 1 {
		t.Fatal("read repair : le nœud 2 consulté en retard doit être mis à jour par la lecture")
	}
}

func TestM3ReadNeedsRResponses(t *testing.T) {
	c := NewCluster(3, 2, 2)
	c.Write("k", "v", 1)
	if _, _, err := c.Read("k", 0); !errors.Is(err, ErrQuorum) {
		t.Fatalf("lire un seul nœud avec r=2 : %v, attendu ErrQuorum", err)
	}
	c.SetDown(0, true)
	if _, _, err := c.Read("k", 0, 1); !errors.Is(err, ErrQuorum) {
		t.Fatalf("un des deux nœuds consultés est en panne : %v, attendu ErrQuorum", err)
	}
	if v, _, err := c.Read("k"); err != nil || v != "v" {
		t.Fatalf("sans liste, on interroge tous les nœuds : %q %v", v, err)
	}
}

func TestM3WeakQuorumReadsStaleData(t *testing.T) {
	c := NewCluster(5, 1, 1) // w + r <= n
	c.SetDown(4, true)
	c.Write("k", "new", 7)
	c.SetDown(4, false)
	v, ver, err := c.Read("k", 4)
	if err != nil || v != "" || ver != 0 {
		t.Fatalf("avec w=1, r=1, lire le nœud 4 renvoie une donnée périmée : %q v%d %v", v, ver, err)
	}
	strong := NewCluster(5, 3, 3)
	strong.SetDown(4, true)
	strong.Write("k", "new", 7)
	strong.SetDown(4, false)
	v, ver, _ = strong.Read("k", 4, 3, 2)
	if v != "new" || ver != 7 {
		t.Fatalf("avec w=3, r=3 : %q v%d, attendu new v7 (au moins un nœud lu est à jour)", v, ver)
	}
}

func TestM3FailedWriteIsNotRolledBack(t *testing.T) {
	c := NewCluster(3, 2, 2)
	c.SetDown(1, true)
	c.SetDown(2, true)
	if err := c.Write("k", "ghost", 1); !errors.Is(err, ErrQuorum) {
		t.Fatalf("écriture sur un seul nœud : %v", err)
	}
	if c.NodeVersion(0, "k") != 1 {
		t.Fatal("une écriture échouée n'est pas annulée sur les nœuds qui l'ont reçue")
	}
	c.SetDown(1, false)
	c.SetDown(2, false)
	if v, _, _ := c.Read("k", 0, 1); v != "ghost" {
		t.Fatalf("lecture après coup : %q — une écriture « échouée » peut quand même apparaître", v)
	}
}

func TestM3AntiEntropyCopiesTheNewest(t *testing.T) {
	c := NewCluster(3, 2, 2)
	c.SetDown(2, true)
	c.Write("a", "1", 1)
	c.Write("b", "2", 3)
	c.SetDown(2, false)
	c.AntiEntropy()
	if c.NodeVersion(2, "a") != 1 || c.NodeVersion(2, "b") != 3 {
		t.Fatal("l'anti-entropie doit copier toutes les clés manquantes sur le nœud en retard, même celles qu'on ne lit jamais")
	}
	c.SetDown(1, true)
	c.Write("a", "1bis", 5)
	c.SetDown(1, false)
	c.AntiEntropy()
	if c.NodeVersion(1, "a") != 5 {
		t.Fatal("l'anti-entropie doit propager la version la plus récente")
	}
}
