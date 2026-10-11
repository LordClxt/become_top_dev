package lab

import (
	"errors"
	"reflect"
	"testing"
)

// ---------- Jalon 1 : vecteurs de versions ----------

func TestM1Compare(t *testing.T) {
	cases := []struct {
		name string
		a, b VersionVector
		want Ordering
	}{
		{"deux vides", VersionVector{}, VersionVector{}, Equal},
		{"nil contre vide", nil, VersionVector{}, Equal},
		{"une entrée à zéro vaut une entrée absente", VersionVector{"A": 1, "B": 0}, VersionVector{"A": 1}, Equal},
		{"même réplica, compteur plus petit", VersionVector{"A": 1}, VersionVector{"A": 2}, Before},
		{"b connaît une écriture de plus", VersionVector{"A": 2}, VersionVector{"A": 2, "B": 1}, Before},
		{"nil avant tout vecteur non vide", nil, VersionVector{"A": 1}, Before},
		{"a domine b", VersionVector{"A": 2, "B": 1}, VersionVector{"A": 1, "B": 1}, After},
		{"deux réplicas différents", VersionVector{"A": 1}, VersionVector{"B": 1}, Concurrent},
		{"croisés", VersionVector{"A": 2, "B": 1}, VersionVector{"A": 1, "B": 2}, Concurrent},
	}
	for _, c := range cases {
		if got := Compare(c.a, c.b); got != c.want {
			t.Errorf("%s : Compare(%v, %v) = %v, attendu %v — compare entrée par entrée, une entrée absente vaut 0", c.name, c.a, c.b, got, c.want)
		}
	}
}

func TestM1Merge(t *testing.T) {
	a := VersionVector{"A": 3, "B": 1}
	b := VersionVector{"B": 4, "C": 2}
	got := Merge(a, b)
	want := VersionVector{"A": 3, "B": 4, "C": 2}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("Merge = %v, attendu %v — le maximum entrée par entrée", got, want)
	}
	if !reflect.DeepEqual(a, VersionVector{"A": 3, "B": 1}) || !reflect.DeepEqual(b, VersionVector{"B": 4, "C": 2}) {
		t.Error("Merge ne doit modifier aucun de ses arguments : renvoie un nouveau vecteur")
	}
	if m := Merge(nil, nil); m == nil {
		t.Error("Merge(nil, nil) doit renvoyer un vecteur vide utilisable, pas nil")
	}
}

func TestM1Clock(t *testing.T) {
	v := Version{Value: "x", Node: "A", Seq: 3, Seen: VersionVector{"A": 2, "B": 5}}
	if got, want := v.Clock(), (VersionVector{"A": 3, "B": 5}); !reflect.DeepEqual(got, want) {
		t.Errorf("Clock = %v, attendu %v — le contexte plus l'écriture elle-même", got, want)
	}
	if !reflect.DeepEqual(v.Seen, VersionVector{"A": 2, "B": 5}) {
		t.Error("Clock ne doit pas modifier Seen")
	}
}

func TestM1Prune(t *testing.T) {
	v1 := Version{Value: "v1", Node: "A", Seq: 1}
	v2 := Version{Value: "v2", Node: "B", Seq: 1, Seen: VersionVector{"A": 1}}
	x := Version{Value: "x", Node: "A", Seq: 2}
	y := Version{Value: "y", Node: "A", Seq: 3}
	cases := []struct {
		name string
		in   []Version
		want []string
	}{
		{"vide", nil, []string{}},
		{"v2 a vu v1 : v1 disparaît", []Version{v1, v2}, []string{"v2"}},
		{"l'ordre d'arrivée ne compte pas", []Version{v2, v1}, []string{"v2"}},
		{"doublon reçu deux fois", []Version{v2, v2}, []string{"v2"}},
		{"même coordinateur, contextes vides : concurrentes, on garde les deux", []Version{y, x}, []string{"x", "y"}},
	}
	for _, c := range cases {
		got := Prune(c.in)
		if got == nil {
			t.Errorf("%s : Prune ne doit jamais renvoyer nil", c.name)
			continue
		}
		var vals []string
		for _, v := range got {
			vals = append(vals, v.Value)
		}
		if vals == nil {
			vals = []string{}
		}
		if !reflect.DeepEqual(vals, c.want) {
			t.Errorf("%s : Prune = %v, attendu %v — une version n'est remplacée que si l'écrivain d'une autre l'avait vue (Seen)", c.name, vals, c.want)
		}
	}
	if got := Prune([]Version{y, x}); got[0].Seq != 2 {
		t.Error("Prune doit trier par Node puis Seq")
	}
}

// ---------- Jalon 2 : quorums et read repair ----------

func cluster(t *testing.T, w, r int) *Cluster {
	t.Helper()
	c, err := NewCluster([]string{"A", "B", "C"}, w, r)
	if err != nil {
		t.Fatalf("NewCluster(A,B,C, w=%d, r=%d) : %v", w, r, err)
	}
	return c
}

func TestM2Config(t *testing.T) {
	bad := []struct {
		ids  []string
		w, r int
	}{
		{nil, 1, 1},
		{[]string{"A", "B", "C"}, 0, 2},
		{[]string{"A", "B", "C"}, 4, 1},
		{[]string{"A", "B", "C"}, 2, 0},
		{[]string{"A", "A", "B"}, 2, 2},
		{[]string{"A", ""}, 1, 1},
	}
	for _, b := range bad {
		if _, err := NewCluster(b.ids, b.w, b.r); !errors.Is(err, ErrConfig) {
			t.Errorf("NewCluster(%v, w=%d, r=%d) : err = %v, attendu ErrConfig — 1 ≤ w, r ≤ n, identifiants uniques", b.ids, b.w, b.r, err)
		}
	}
	c := cluster(t, 2, 2)
	if err := c.SetDown("Z", true); !errors.Is(err, ErrUnknown) {
		t.Errorf("SetDown(Z) : err = %v, attendu ErrUnknown", err)
	}
}

func TestM2QuorumWriteRead(t *testing.T) {
	c := cluster(t, 2, 2)
	if _, err := c.Put("k", "v1", nil); err != nil {
		t.Fatalf("Put avec 3 réplicas disponibles et w=2 : %v", err)
	}
	for _, id := range []string{"A", "B", "C"} {
		if got := c.Local(id, "k"); !reflect.DeepEqual(got, []string{"v1"}) {
			t.Errorf("réplica %s contient %v, attendu [v1] — l'écriture part vers TOUS les réplicas disponibles", id, got)
		}
	}
	res, err := c.Get("k")
	if err != nil || !reflect.DeepEqual(res.Values, []string{"v1"}) {
		t.Fatalf("Get = %v, %v ; attendu [v1]", res.Values, err)
	}
	if _, err := c.Put("k", "v2", res.Context); err != nil {
		t.Fatal(err)
	}
	res, _ = c.Get("k")
	if !reflect.DeepEqual(res.Values, []string{"v2"}) {
		t.Errorf("après Put(v2, contexte lu), Get = %v, attendu [v2] — le contexte dit au serveur ce que le client a vu", res.Values)
	}
	if empty, err := c.Get("absente"); err != nil || len(empty.Values) != 0 || empty.Context == nil {
		t.Errorf("Get d'une clé absente = %+v, %v ; attendu aucune valeur et un contexte vide non nil", empty, err)
	}
}

func TestM2NoQuorum(t *testing.T) {
	c := cluster(t, 3, 2)
	_ = c.SetDown("C", true)
	_, err := c.Put("k", "v1", nil)
	if !errors.Is(err, ErrNoQuorum) {
		t.Fatalf("w=3 avec un réplica en panne : err = %v, attendu ErrNoQuorum", err)
	}
	if got := c.Local("A", "k"); !reflect.DeepEqual(got, []string{"v1"}) {
		t.Errorf("A contient %v : une écriture en échec de quorum n'est PAS annulée sur les réplicas qui l'ont reçue", got)
	}
	_ = c.SetDown("B", true)
	if _, err := c.Get("k"); !errors.Is(err, ErrNoQuorum) {
		t.Errorf("r=2 avec un seul réplica disponible : err = %v, attendu ErrNoQuorum", err)
	}
}

func TestM2ReadRepair(t *testing.T) {
	c := cluster(t, 2, 2)
	_ = c.SetDown("A", true)
	if _, err := c.Put("k", "v1", nil); err != nil {
		t.Fatalf("w=2 avec B et C disponibles : %v", err)
	}
	_ = c.SetDown("A", false)
	if got := c.Local("A", "k"); len(got) != 0 {
		t.Fatalf("A était en panne pendant l'écriture : il ne doit rien contenir, il contient %v", got)
	}
	res, err := c.Get("k")
	if err != nil || !reflect.DeepEqual(res.Values, []string{"v1"}) {
		t.Fatalf("w + r > n : la lecture (A et B) doit voir v1 ; obtenu %v, %v", res.Values, err)
	}
	if got := c.Local("A", "k"); !reflect.DeepEqual(got, []string{"v1"}) {
		t.Errorf("après la lecture, A contient %v : le read repair doit réécrire la valeur récente sur le réplica en retard", got)
	}
}

func TestM2StaleWithoutOverlap(t *testing.T) {
	c := cluster(t, 2, 1)
	_ = c.SetDown("A", true)
	_, _ = c.Put("k", "v1", nil)
	_ = c.SetDown("A", false)
	res, err := c.Get("k")
	if err != nil {
		t.Fatal(err)
	}
	if len(res.Values) != 0 {
		t.Errorf("w=2, r=1, n=3 : Get ne lit que A, qui a manqué l'écriture ; attendu aucune valeur, obtenu %v — interroge exactement les r premiers réplicas disponibles", res.Values)
	}
}

// ---------- Jalon 3 : siblings, fusion, anti-entropie ----------

func TestM3ConcurrentSameCoordinator(t *testing.T) {
	c := cluster(t, 2, 2)
	_, _ = c.Put("panier", "lait", nil)
	_, _ = c.Put("panier", "oeufs", nil)
	res, _ := c.Get("panier")
	if !reflect.DeepEqual(res.Values, []string{"lait", "oeufs"}) {
		t.Fatalf("deux clients écrivent sans avoir rien lu : Get = %v, attendu les deux siblings [lait oeufs] — "+
			"même si A a coordonné les deux, la 2e écriture n'avait pas vu la 1re", res.Values)
	}
	if want := (VersionVector{"A": 2}); !reflect.DeepEqual(res.Context, want) {
		t.Errorf("Context = %v, attendu %v — la fusion des vecteurs des siblings", res.Context, want)
	}
	merged := UnionMerge(res.Values)
	if _, err := c.Put("panier", merged, res.Context); err != nil {
		t.Fatal(err)
	}
	res, _ = c.Get("panier")
	if !reflect.DeepEqual(res.Values, []string{"lait,oeufs"}) {
		t.Errorf("après l'écriture de la fusion avec le contexte, Get = %v, attendu [lait,oeufs]", res.Values)
	}
}

func TestM3StaleContextMakesSiblings(t *testing.T) {
	c := cluster(t, 2, 2)
	_, _ = c.Put("k", "v1", nil)
	read, _ := c.Get("k")
	ctx := read.Context
	_, _ = c.Put("k", "v2", ctx)
	_ = c.SetDown("A", true) // l'autre client passe par B
	_, _ = c.Put("k", "v3", ctx)
	_ = c.SetDown("A", false)
	res, _ := c.Get("k")
	if !reflect.DeepEqual(res.Values, []string{"v2", "v3"}) {
		t.Errorf("v2 et v3 ont été écrits avec le même contexte (v1) : Get = %v, attendu [v2 v3] — v1 remplacé, v2 et v3 concurrents", res.Values)
	}
	if ctx["A"] != 1 || len(ctx) != 1 {
		t.Errorf("le contexte passé à Put a été modifié : %v", ctx)
	}
}

func TestM3UnionMerge(t *testing.T) {
	cases := []struct {
		in   []string
		want string
	}{
		{nil, ""},
		{[]string{"lait"}, "lait"},
		{[]string{"lait,oeufs", "farine,lait"}, "farine,lait,oeufs"},
		{[]string{"jambon, ", " ,", "beurre"}, "beurre,jambon"},
	}
	for _, c := range cases {
		if got := UnionMerge(c.in); got != c.want {
			t.Errorf("UnionMerge(%q) = %q, attendu %q — union triée, sans doublon ni article vide", c.in, got, c.want)
		}
	}
}

func TestM3AntiEntropy(t *testing.T) {
	c := cluster(t, 2, 2)
	_ = c.SetDown("C", true)
	_, _ = c.Put("a", "1", nil)
	_, _ = c.Put("b", "2", nil)
	_ = c.SetDown("C", false)
	if n := c.AntiEntropy(); n != 2 {
		t.Errorf("AntiEntropy = %d, attendu 2 (C rattrape les clés a et b)", n)
	}
	if got := c.Local("C", "b"); !reflect.DeepEqual(got, []string{"2"}) {
		t.Errorf("C contient %v pour b, attendu [2] — l'anti-entropie copie ce qui manque, même sans lecture", got)
	}
	if n := c.AntiEntropy(); n != 0 {
		t.Errorf("deuxième passage : %d changements, attendu 0 — les réplicas sont déjà alignés", n)
	}
}
