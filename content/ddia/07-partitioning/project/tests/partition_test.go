package lab

import (
	"errors"
	"fmt"
	"reflect"
	"slices"
	"sort"
	"testing"
)

func userKeys(n int) []string {
	keys := make([]string, n)
	for i := range keys {
		keys[i] = fmt.Sprintf("user-%d", i)
	}
	return keys
}

// ---------- Jalon 1 ----------

func TestM1NewRouterErrors(t *testing.T) {
	cases := []struct {
		name       string
		partitions int
		nodes      []string
		want       error
	}{
		{"aucun nœud", 8, nil, ErrNoNodes},
		{"moins de partitions que de nœuds", 2, []string{"a", "b", "c"}, ErrTooFewPartitions},
		{"nœud en double", 8, []string{"a", "b", "a"}, ErrDuplicateNode},
	}
	for _, c := range cases {
		if _, err := NewRouter(c.partitions, c.nodes); !errors.Is(err, c.want) {
			t.Errorf("%s : err = %v, attendu %v", c.name, err, c.want)
		}
	}
}

func TestM1RoundRobinAssignment(t *testing.T) {
	r, err := NewRouter(8, []string{"a", "b", "c"})
	if err != nil {
		t.Fatal(err)
	}
	if r.Partitions() != 8 {
		t.Errorf("Partitions() = %d, attendu 8", r.Partitions())
	}
	want := map[string][]int{"a": {0, 3, 6}, "b": {1, 4, 7}, "c": {2, 5}}
	if got := r.Assignment(); !reflect.DeepEqual(got, want) {
		t.Errorf("Assignment() = %v, attendu %v — la partition p va à nodes[p %% len(nodes)], partitions triées", got, want)
	}
}

func TestM1KeyToPartitionToNode(t *testing.T) {
	r, err := NewRouter(64, []string{"a", "b", "c", "d"})
	if err != nil {
		t.Fatal(err)
	}
	owner := map[int]string{}
	for n, parts := range r.Assignment() {
		for _, p := range parts {
			owner[p] = n
		}
	}
	for _, k := range []string{"", "user-42", "capteur-017", "zoé"} {
		p := r.Partition(k)
		if want := int(HashKey(k) % 64); p != want {
			t.Errorf("Partition(%q) = %d, attendu %d — HashKey(clé) modulo le nombre de partitions", k, p, want)
		}
		if got := r.NodeFor(k); got != owner[p] {
			t.Errorf("NodeFor(%q) = %q, mais la partition %d appartient à %q", k, got, p, owner[p])
		}
	}
}

func TestM1EvenSpread(t *testing.T) {
	r, err := NewRouter(64, []string{"a", "b", "c", "d"})
	if err != nil {
		t.Fatal(err)
	}
	other, _ := NewRouter(64, []string{"a", "b", "c", "d"})
	count := map[string]int{}
	for _, k := range userKeys(10000) {
		n := r.NodeFor(k)
		count[n]++
		if other.NodeFor(k) != n {
			t.Fatalf("deux routeurs identiques envoient %q à des nœuds différents : le hachage doit être stable", k)
		}
	}
	for n, c := range count {
		if c < 2000 || c > 3000 {
			t.Errorf("le nœud %s reçoit %d clés sur 10 000 : le hachage devrait répartir à peu près équitablement (≈ 2 500)", n, c)
		}
	}
}

// ---------- Jalon 2 ----------

func TestM2AddNodeMovesWholePartitions(t *testing.T) {
	r, err := NewRouter(64, []string{"a", "b", "c", "d"})
	if err != nil {
		t.Fatal(err)
	}
	moves, err := r.AddNode("e")
	if err != nil {
		t.Fatal(err)
	}
	if len(moves) != 12 {
		t.Fatalf("AddNode a fait %d déplacements, attendu 12 (64 / 5 nœuds = 12 partitions pour le nouveau)", len(moves))
	}
	first := []Move{{60, "a", "e"}, {61, "b", "e"}, {62, "c", "e"}, {63, "d", "e"}, {56, "a", "e"}}
	if !reflect.DeepEqual(moves[:5], first) {
		t.Errorf("premiers déplacements = %v, attendu %v — donneur = le plus chargé (à égalité le plus petit nom), qui cède sa plus grande partition", moves[:5], first)
	}
	for _, m := range moves {
		if m.To != "e" {
			t.Errorf("déplacement %v : seul le nouveau nœud doit recevoir des partitions", m)
		}
	}
	sizes := []int{}
	for _, parts := range r.Assignment() {
		sizes = append(sizes, len(parts))
	}
	if len(sizes) != 5 || slices.Max(sizes)-slices.Min(sizes) > 1 {
		t.Errorf("répartition après ajout = %v : 5 nœuds, écart d'au plus 1 partition attendu", sizes)
	}
}

func TestM2OnlyMovedPartitionsChangeNode(t *testing.T) {
	r, _ := NewRouter(64, []string{"a", "b", "c", "d"})
	keys := userKeys(10000)
	before := map[string]string{}
	partBefore := map[string]int{}
	for _, k := range keys {
		before[k] = r.NodeFor(k)
		partBefore[k] = r.Partition(k)
	}
	moves, err := r.AddNode("e")
	if err != nil {
		t.Fatal(err)
	}
	movedParts := map[int]bool{}
	for _, m := range moves {
		movedParts[m.Partition] = true
	}
	expected := 0
	for _, k := range keys {
		if r.Partition(k) != partBefore[k] {
			t.Fatalf("la clé %q a changé de partition : avec un nombre fixe de partitions, seule l'affectation partition → nœud change", k)
		}
		if movedParts[partBefore[k]] {
			expected++
		}
	}
	got := KeysMoved(keys, func(k string) string { return before[k] }, r.NodeFor)
	if got != expected {
		t.Errorf("KeysMoved = %d, attendu %d (les clés des partitions déplacées, et elles seules)", got, expected)
	}
	if frac := float64(got) / float64(len(keys)); frac > 0.25 {
		t.Errorf("%.0f %% des clés ont bougé : un nouveau nœud sur 5 ne devrait en prendre qu'environ 19 %%", frac*100)
	}
}

func TestM2ModNMovesAlmostEverything(t *testing.T) {
	keys := userKeys(10000)
	four := []string{"a", "b", "c", "d"}
	five := []string{"a", "b", "c", "d", "e"}
	if got := ModNNode("user-1", four); got != four[HashKey("user-1")%4] {
		t.Errorf("ModNNode(user-1) = %q, attendu nodes[HashKey %% 4]", got)
	}
	moved := KeysMoved(keys, func(k string) string { return ModNNode(k, four) }, func(k string) string { return ModNNode(k, five) })
	if frac := float64(moved) / float64(len(keys)); frac < 0.7 {
		t.Errorf("hash mod N de 4 à 5 nœuds : %.0f %% des clés ont bougé, attendu ≈ 80 %%", frac*100)
	}
}

func TestM2KeysMovedAndErrors(t *testing.T) {
	before := map[string]string{"x": "a", "y": "b", "z": "c"}
	after := map[string]string{"x": "a", "y": "c", "z": "a"}
	if got := KeysMoved([]string{"x", "y", "z"}, func(k string) string { return before[k] }, func(k string) string { return after[k] }); got != 2 {
		t.Errorf("KeysMoved = %d, attendu 2 (y et z changent de nœud)", got)
	}
	r, _ := NewRouter(8, []string{"a", "b"})
	if _, err := r.AddNode("a"); !errors.Is(err, ErrDuplicateNode) {
		t.Errorf("AddNode d'un nœud existant : err = %v, attendu ErrDuplicateNode", err)
	}
	small, _ := NewRouter(2, []string{"a", "b"})
	if _, err := small.AddNode("c"); !errors.Is(err, ErrTooFewPartitions) {
		t.Errorf("3 nœuds pour 2 partitions : err = %v, attendu ErrTooFewPartitions — une partition ne se partage pas", err)
	}
}

// ---------- Jalon 3 ----------

func TestM3SplitAtMedian(t *testing.T) {
	rp := NewRangePartitioner(4)
	if rp.Len() != 1 || len(rp.Boundaries()) != 0 || rp.PartitionOf("x") != 0 {
		t.Fatalf("au départ : une seule partition qui couvre tout (Len=%d, Boundaries=%v)", rp.Len(), rp.Boundaries())
	}
	for _, k := range []string{"d", "b", "a", "c", "b"} {
		rp.Put(k)
	}
	if rp.Len() != 1 {
		t.Fatalf("4 clés distinctes (b en double) pour maxKeys = 4 : pas encore de découpage, Len = %d", rp.Len())
	}
	rp.Put("e")
	if !reflect.DeepEqual(rp.Boundaries(), []string{"c"}) {
		t.Fatalf("Boundaries() = %v, attendu [c] — a b c d e se coupe au milieu : [a b] et [c d e]", rp.Boundaries())
	}
	if !reflect.DeepEqual(rp.Keys(0), []string{"a", "b"}) || !reflect.DeepEqual(rp.Keys(1), []string{"c", "d", "e"}) {
		t.Errorf("Keys = %v / %v, attendu [a b] / [c d e]", rp.Keys(0), rp.Keys(1))
	}
	cases := map[string]int{"": 0, "b": 0, "bz": 0, "c": 1, "zzz": 1}
	for k, want := range cases {
		if got := rp.PartitionOf(k); got != want {
			t.Errorf("PartitionOf(%q) = %d, attendu %d — la borne basse est incluse", k, got, want)
		}
	}
}

func TestM3ManyKeysStaySortedAndBounded(t *testing.T) {
	rp := NewRangePartitioner(8)
	var all []string
	for i := 0; i < 300; i++ {
		k := fmt.Sprintf("k%05d", (i*7919)%1000)
		rp.Put(k)
		all = append(all, k)
	}
	sort.Strings(all)
	all = slices.Compact(all)
	var got []string
	for i := 0; i < rp.Len(); i++ {
		keys := rp.Keys(i)
		if len(keys) > 8 {
			t.Errorf("partition %d : %d clés, maximum 8 — elle aurait dû être découpée", i, len(keys))
		}
		for _, k := range keys {
			if rp.PartitionOf(k) != i {
				t.Errorf("la clé %q est rangée dans la partition %d mais PartitionOf dit %d", k, i, rp.PartitionOf(k))
			}
		}
		got = append(got, keys...)
	}
	if !slices.Equal(got, all) {
		t.Errorf("les partitions mises bout à bout doivent redonner toutes les clés, triées, sans doublon (%d attendues, %d trouvées)", len(all), len(got))
	}
	if rp.Len() < 300/8 {
		t.Errorf("Len() = %d : 300 clés de 8 au plus par partition demandent au moins 38 partitions", rp.Len())
	}
}

func TestM3ScanTouchesOnlyOverlappingPartitions(t *testing.T) {
	rp := NewRangePartitioner(4)
	for _, k := range []string{"a", "b", "c", "d", "e", "f", "g", "h", "i"} {
		rp.Put(k)
	}
	// Bornes attendues après ces insertions : [c e g]
	if !reflect.DeepEqual(rp.Boundaries(), []string{"c", "e", "g"}) {
		t.Fatalf("Boundaries() = %v, attendu [c e g]", rp.Boundaries())
	}
	cases := []struct {
		from, to string
		keys     []string
		parts    int
	}{
		{"c", "e", []string{"c", "d"}, 1},
		{"b", "f", []string{"b", "c", "d", "e"}, 3},
		{"a", "zz", []string{"a", "b", "c", "d", "e", "f", "g", "h", "i"}, 4},
		{"g", "g", []string{}, 0},
	}
	for _, c := range cases {
		keys, parts := rp.Scan(c.from, c.to)
		if !slices.Equal(keys, c.keys) || parts != c.parts {
			t.Errorf("Scan(%q, %q) = %v, %d partitions ; attendu %v, %d — un scan d'intervalle ne touche que les partitions qui recoupent [from, to)", c.from, c.to, keys, parts, c.keys, c.parts)
		}
	}
}

func TestM3TimestampHotSpot(t *testing.T) {
	rp := NewRangePartitioner(10)
	for i := 0; i < 200; i++ {
		n := rp.Len()
		key := fmt.Sprintf("2026-10-11T%05d", i)
		if got := rp.Put(key); got != n-1 {
			t.Fatalf("l'écriture %q est allée dans la partition %d sur %d : une clé horodatée croissante tombe toujours dans la dernière plage", key, got, n)
		}
	}
	prefixed := NewRangePartitioner(10)
	for i := 0; i < 400; i++ {
		prefixed.Put(fmt.Sprintf("capteur-%02d/2026-10-11T%05d", i%20, i/20))
	}
	hit := map[int]bool{}
	for i := 400; i < 500; i++ {
		hit[prefixed.Put(fmt.Sprintf("capteur-%02d/2026-10-11T%05d", i%20, i/20))] = true
	}
	if len(hit) < 5 {
		t.Errorf("avec le capteur en tête de clé, 100 écritures ne touchent que %d partitions : elles devraient se répartir", len(hit))
	}
}
