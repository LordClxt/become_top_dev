package lab

import (
	"fmt"
	"reflect"
	"sort"
	"testing"
)

func keys(n int) []string {
	out := make([]string, n)
	for i := range out {
		out[i] = fmt.Sprintf("user-%d", i)
	}
	return out
}

// ---------- Jalon 1 ----------

func TestM1HashPartitionIsStableAndInRange(t *testing.T) {
	for _, k := range keys(500) {
		p := HashPartition(k, 8)
		if p < 0 || p >= 8 {
			t.Fatalf("HashPartition(%q, 8) = %d, hors de [0, 8[", k, p)
		}
		if p != HashPartition(k, 8) {
			t.Fatalf("la partition d'une clé doit être stable")
		}
	}
	if HashPartition("x", 1) != 0 {
		t.Error("avec une seule partition, tout va à la partition 0")
	}
}

func TestM1HashPartitionSpreadsKeysEvenly(t *testing.T) {
	count := make([]int, 8)
	for _, k := range keys(8000) {
		count[HashPartition(k, 8)]++
	}
	for p, c := range count {
		if c < 800 || c > 1200 {
			t.Errorf("partition %d : %d clés sur 8000 ; attendu environ 1000 (un bon hachage répartit de façon uniforme) : %v", p, c, count)
		}
	}
}

func TestM1HashPartitionKeepsHashOrder(t *testing.T) {
	// les partitions sont des TRANCHES contiguës de l'espace des hachages : un hachage plus grand ne peut pas aller à une partition plus petite
	ks := keys(2000)
	sort.Slice(ks, func(i, j int) bool { return Hash(ks[i]) < Hash(ks[j]) })
	last := 0
	for _, k := range ks {
		p := HashPartition(k, 16)
		if p < last {
			t.Fatalf("la partition de %q (%d) est inférieure à celle d'un hachage plus petit (%d) : il faut découper l'espace des hachages en tranches", k, p, last)
		}
		last = p
	}
}

func TestM1RangePartitionerLocate(t *testing.T) {
	r := NewRangePartitioner([]string{"c", "m", "t"}) // [..c[ [c..m[ [m..t[ [t..]
	if r.Partitions() != 4 {
		t.Fatalf("Partitions = %d, attendu 4", r.Partitions())
	}
	cases := map[string]int{"a": 0, "b": 0, "c": 1, "lzzz": 1, "m": 2, "s": 2, "t": 3, "zebra": 3, "": 0}
	for k, want := range cases {
		if got := r.Locate(k); got != want {
			t.Errorf("Locate(%q) = %d, attendu %d (une borne appartient à la partition qu'elle ouvre)", k, got, want)
		}
	}
}

func TestM1RangeQueryTouchesOnlyNeededPartitions(t *testing.T) {
	r := NewRangePartitioner([]string{"c", "m", "t"})
	if got := r.RangeQuery("d", "k"); !reflect.DeepEqual(got, []int{1}) {
		t.Errorf("RangeQuery(d,k) = %v, attendu [1] : une plage dans une partition n'en touche qu'une", got)
	}
	if got := r.RangeQuery("b", "n"); !reflect.DeepEqual(got, []int{0, 1, 2}) {
		t.Errorf("RangeQuery(b,n) = %v, attendu [0 1 2]", got)
	}
}

func TestM1SensorKeysHotSpotAndFix(t *testing.T) {
	// clé = horodatage : toutes les écritures du jour tombent dans la même partition
	r := NewRangePartitioner([]string{"2026-10-02", "2026-10-03", "2026-10-04"})
	hot := map[int]bool{}
	for h := 0; h < 24; h++ {
		hot[r.Locate(fmt.Sprintf("2026-10-03T%02d:00", h))] = true
	}
	if len(hot) != 1 {
		t.Fatalf("les écritures d'un même jour doivent toutes aller à une partition (le hot spot) : %v", hot)
	}
	// clé = capteur puis horodatage : les écritures simultanées se répartissent
	byName := NewRangePartitioner([]string{"capteur-25", "capteur-50", "capteur-75"})
	spread := map[int]bool{}
	for s := 0; s < 100; s++ {
		spread[byName.Locate(fmt.Sprintf("capteur-%02d|2026-10-03T10:00", s))] = true
	}
	if len(spread) != 4 {
		t.Fatalf("avec le capteur en tête de clé, les écritures simultanées touchent %d partitions, attendu 4", len(spread))
	}
}

func TestM1SaltedKeysSpreadAHotKey(t *testing.T) {
	salted := AllSalted("celebrity", 100)
	if len(salted) != 100 || salted[0] != "celebrity#00" || salted[99] != "celebrity#99" {
		t.Fatalf("AllSalted = %v ... ; attendu celebrity#00 à celebrity#99", salted[:3])
	}
	if SaltedKey("celebrity", 7) != "celebrity#07" {
		t.Fatalf("SaltedKey = %q", SaltedKey("celebrity", 7))
	}
	parts := map[int]bool{}
	for _, k := range salted {
		parts[HashPartition(k, 8)] = true
	}
	if len(parts) < 6 {
		t.Errorf("100 sous-clés ne touchent que %d partitions sur 8 : le sel doit répartir les écritures", len(parts))
	}
	if HashPartition("celebrity", 8) != HashPartition("celebrity", 8) {
		t.Fatal("sans sel, la clé reste sur une seule partition")
	}
}

// ---------- Jalon 2 ----------

func TestM2ModNMovesMostKeys(t *testing.T) {
	ks := keys(10000)
	moved := MovedFraction(ks, func(k string) int { return ModNPartition(k, 10) }, func(k string) int { return ModNPartition(k, 11) })
	if moved < 0.85 {
		t.Fatalf("hash mod N : %.0f %% des clés déplacées en passant de 10 à 11 nœuds ; attendu plus de 85 %%", moved*100)
	}
	if MovedFraction(nil, nil, nil) != 0 {
		t.Error("aucune clé : 0")
	}
}

func TestM2FixedPartitionsMoveFewKeys(t *testing.T) {
	ks := keys(10000)
	nodes := []string{"n01", "n02", "n03", "n04", "n05", "n06", "n07", "n08", "n09", "n10"}
	before := Assign(100, nodes)
	after, moved := AddNode(before, "n11")
	if moved != 9 {
		t.Fatalf("AddNode a déplacé %d partitions, attendu 9 (100 ÷ 11, arrondi inférieur)", moved)
	}
	f := MovedFraction(ks,
		func(k string) int { return nodeIndex(before[HashPartition(k, 100)]) },
		func(k string) int { return nodeIndex(after[HashPartition(k, 100)]) })
	if f > 0.15 {
		t.Fatalf("partitions fixes : %.0f %% des clés déplacées, attendu moins de 15 %%", f*100)
	}
}

func nodeIndex(n string) int {
	var i int
	fmt.Sscanf(n, "n%d", &i)
	return i
}

func TestM2AssignBalances(t *testing.T) {
	a := Assign(12, []string{"A", "B", "C"})
	if !reflect.DeepEqual(a.Load(), map[string]int{"A": 4, "B": 4, "C": 4}) || !a.Balanced() {
		t.Fatalf("12 partitions sur 3 nœuds : %v", a.Load())
	}
	if a[0] != "A" || a[1] != "B" || a[3] != "A" {
		t.Errorf("la partition i va au nœud i mod len(nodes) : %v", a)
	}
	if Assign(10, []string{"A", "B", "C"}).Balanced() != true {
		t.Error("10 partitions sur 3 nœuds : 4, 3, 3 est équilibré")
	}
}

func TestM2AddNodeStealsWholePartitions(t *testing.T) {
	a := Assign(12, []string{"A", "B", "C"})
	b, moved := AddNode(a, "D")
	if moved != 3 || !reflect.DeepEqual(b.Load(), map[string]int{"A": 3, "B": 3, "C": 3, "D": 3}) {
		t.Fatalf("AddNode : %d déplacées, charges %v ; attendu 3 et 3 par nœud", moved, b.Load())
	}
	changed := 0
	for p := range a {
		if a[p] != b[p] {
			changed++
			if b[p] != "D" {
				t.Errorf("la partition %d a changé de %s vers %s : seul le nouveau nœud doit recevoir des partitions", p, a[p], b[p])
			}
		}
	}
	if changed != 3 {
		t.Errorf("%d partitions ont changé de propriétaire, attendu 3 (le minimum)", changed)
	}
	if a.Load()["D"] != 0 {
		t.Error("AddNode ne doit pas modifier l'affectation d'origine")
	}
}

func TestM2AddNodeKeepsBalanceWhenUneven(t *testing.T) {
	a := Assign(10, []string{"A", "B", "C"})
	b, moved := AddNode(a, "D")
	if moved != 2 || !b.Balanced() {
		t.Fatalf("10 partitions, 3 puis 4 nœuds : %d déplacées, charges %v ; attendu 2 et équilibré", moved, b.Load())
	}
}

func TestM2RemoveNodeRedistributes(t *testing.T) {
	a := Assign(12, []string{"A", "B", "C", "D"})
	b, moved := RemoveNode(a, "D")
	if moved != 3 || !b.Balanced() || len(b.Load()) != 3 {
		t.Fatalf("RemoveNode : %d déplacées, charges %v", moved, b.Load())
	}
	for p := range a {
		if a[p] != "D" && a[p] != b[p] {
			t.Errorf("la partition %d n'appartenait pas à D mais a bougé (%s → %s)", p, a[p], b[p])
		}
		if b[p] == "D" {
			t.Errorf("la partition %d est encore à D", p)
		}
	}
}

// ---------- Jalon 3 ----------

var cars = []Doc{
	{"c1", map[string]string{"color": "red", "make": "Ford"}},
	{"c2", map[string]string{"color": "blue", "make": "Fiat"}},
	{"c3", map[string]string{"color": "red", "make": "Fiat"}},
	{"c4", map[string]string{"color": "red", "make": "Opel"}},
	{"c5", map[string]string{"color": "green", "make": "Ford"}},
	{"c6", map[string]string{"color": "blue", "make": "Opel"}},
}

func fillStore(s IndexedStore) {
	for _, d := range cars {
		s.Put(d)
	}
}

func TestM3BothIndexesFindTheSameCars(t *testing.T) {
	for name, s := range map[string]IndexedStore{"local": NewLocalIndexStore(4), "global": NewGlobalIndexStore(4)} {
		fillStore(s)
		got, _ := s.Query("color", "red")
		if !reflect.DeepEqual(got, []string{"c1", "c3", "c4"}) {
			t.Errorf("%s : color=red → %v, attendu [c1 c3 c4]", name, got)
		}
		if none, _ := s.Query("color", "pink"); len(none) != 0 {
			t.Errorf("%s : terme inconnu → %v", name, none)
		}
		if got, _ := s.Query("make", "Opel"); !reflect.DeepEqual(got, []string{"c4", "c6"}) {
			t.Errorf("%s : make=Opel → %v", name, got)
		}
	}
}

func TestM3LocalIndexScattersReadsButWritesOnePartition(t *testing.T) {
	s := NewLocalIndexStore(4)
	if touched := s.Put(cars[0]); touched != 1 {
		t.Fatalf("Put sur un index local touche %d partitions, attendu 1", touched)
	}
	if _, touched := s.Query("color", "red"); touched != 4 {
		t.Fatalf("Query sur un index local interroge %d partitions, attendu 4 (scatter/gather)", touched)
	}
}

func TestM3GlobalIndexReadsOnePartitionButWritesMany(t *testing.T) {
	s := NewGlobalIndexStore(8)
	if _, touched := s.Query("color", "red"); touched != 1 {
		t.Fatalf("Query sur un index global interroge %d partitions, attendu 1", touched)
	}
	d := Doc{"x", map[string]string{"color": "red", "make": "Ford", "year": "2019", "fuel": "diesel"}}
	distinct := map[int]bool{}
	for f, v := range d.Fields {
		distinct[HashPartition(f+":"+v, 8)] = true
	}
	want := 1 + len(distinct)
	if got := s.Put(d); got != want {
		t.Fatalf("Put sur un index global touche %d partitions, attendu %d (la partition du document + %d partitions d'index distinctes)", got, want, len(distinct))
	}
	if want < 3 {
		t.Fatalf("test mal calibré : %d", want)
	}
}

func TestM3RouterAcceptsOnlyNewerTables(t *testing.T) {
	r := NewRouter(4)
	if _, ok := r.NodeFor("k"); ok {
		t.Fatal("sans table, pas de routage")
	}
	v1 := RoutingTable{Version: 1, Owner: map[int]string{0: "A", 1: "A", 2: "B", 3: "B"}}
	v2 := RoutingTable{Version: 2, Owner: map[int]string{0: "A", 1: "C", 2: "B", 3: "C"}}
	if !r.Update(v1) {
		t.Fatal("la première table doit être acceptée")
	}
	k := "user-1"
	p := HashPartition(k, 4)
	if n, ok := r.NodeFor(k); !ok || n != v1.Owner[p] {
		t.Fatalf("NodeFor = %q %v, attendu %q", n, ok, v1.Owner[p])
	}
	if !r.Update(v2) {
		t.Fatal("une table plus récente doit être acceptée")
	}
	if r.Update(v1) {
		t.Fatal("une table plus ancienne doit être refusée (elle renverrait vers d'anciens propriétaires)")
	}
	if r.Update(v2) {
		t.Fatal("la même version n'apporte rien : refusée")
	}
	if n, _ := r.NodeFor(k); n != v2.Owner[p] {
		t.Fatalf("après v2 puis v1 refusée, NodeFor = %q, attendu %q", n, v2.Owner[p])
	}
}
