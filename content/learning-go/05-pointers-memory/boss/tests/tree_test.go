package lab

import (
	"math"
	"slices"
	"testing"
)

// build insère les valeurs dans l'ordre donné.
func build(values ...int) *Tree {
	var root *Tree
	for _, v := range values {
		root = Insert(root, v)
	}
	return root
}

// valid vérifie l'invariant d'un arbre de recherche (valeurs strictement dans les bornes) et l'absence de cycle.
func valid(t *testing.T, root *Tree) {
	t.Helper()
	count := 0
	var check func(n *Tree, lo, hi int64)
	check = func(n *Tree, lo, hi int64) {
		if n == nil {
			return
		}
		if count++; count > 100000 {
			t.Fatalf("l'arbre semble contenir un cycle")
		}
		if int64(n.Value) <= lo || int64(n.Value) >= hi {
			t.Fatalf("invariant violé : %d n'est pas dans (%d, %d)", n.Value, lo, hi)
		}
		check(n.Left, lo, int64(n.Value))
		check(n.Right, int64(n.Value), hi)
	}
	check(root, math.MinInt64, math.MaxInt64)
}

func TestInsertAndInOrder(t *testing.T) {
	root := build(50, 30, 70, 20, 40, 60, 80)
	if got := InOrder(root); !slices.Equal(got, []int{20, 30, 40, 50, 60, 70, 80}) {
		t.Errorf("InOrder = %v", got)
	}
	if root.Value != 50 || root.Left.Value != 30 || root.Right.Value != 70 {
		t.Errorf("la racine doit rester le premier élément inséré")
	}
	valid(t, root)
}

func TestInsertReturnsTheRoot(t *testing.T) {
	var empty *Tree
	root := Insert(empty, 5)
	if root == nil || root.Value != 5 {
		t.Fatalf("Insert dans un arbre vide doit renvoyer le nouveau nœud : %v", root)
	}
	if again := Insert(root, 3); again != root {
		t.Errorf("la racine d'un arbre non vide ne change pas à l'insertion")
	}
	if InOrder(nil) == nil || len(InOrder(nil)) != 0 {
		t.Errorf("InOrder(nil) doit renvoyer une slice vide non nil")
	}
}

func TestInsertIgnoresDuplicates(t *testing.T) {
	root := build(5, 3, 8, 5, 3, 8, 5)
	if Size(root) != 3 || !slices.Equal(InOrder(root), []int{3, 5, 8}) {
		t.Errorf("les doublons doivent être ignorés : %v", InOrder(root))
	}
}

func TestContainsMinMax(t *testing.T) {
	root := build(50, 30, 70, 20, 40, 60, 80)
	for _, v := range []int{20, 30, 40, 50, 60, 70, 80} {
		if !Contains(root, v) {
			t.Errorf("Contains(%d) = false", v)
		}
	}
	for _, v := range []int{0, 25, 55, 100, -1} {
		if Contains(root, v) {
			t.Errorf("Contains(%d) = true", v)
		}
	}
	if lo, ok := Min(root); !ok || lo != 20 {
		t.Errorf("Min = (%d, %v)", lo, ok)
	}
	if hi, ok := Max(root); !ok || hi != 80 {
		t.Errorf("Max = (%d, %v)", hi, ok)
	}
	if _, ok := Min(nil); ok {
		t.Errorf("Min(nil) doit renvoyer ok = false")
	}
	if _, ok := Max(nil); ok {
		t.Errorf("Max(nil) doit renvoyer ok = false")
	}
	if Contains(nil, 1) {
		t.Errorf("Contains(nil) doit être faux")
	}
}

func TestSizeAndHeight(t *testing.T) {
	if Size(nil) != 0 || Height(nil) != 0 {
		t.Errorf("arbre vide : Size %d, Height %d", Size(nil), Height(nil))
	}
	if root := build(7); Size(root) != 1 || Height(root) != 1 {
		t.Errorf("un seul nœud : Size %d, Height %d", Size(root), Height(root))
	}
	balanced := build(50, 30, 70, 20, 40, 60, 80)
	if Size(balanced) != 7 || Height(balanced) != 3 {
		t.Errorf("arbre équilibré : Size %d, Height %d", Size(balanced), Height(balanced))
	}
	degenerate := build(1, 2, 3, 4, 5)
	if Size(degenerate) != 5 || Height(degenerate) != 5 {
		t.Errorf("insertion triée = liste : Size %d, Height %d", Size(degenerate), Height(degenerate))
	}
}

func TestDelete(t *testing.T) {
	cases := []struct {
		name   string
		values []int
		remove int
		want   []int
	}{
		{"feuille", []int{50, 30, 70, 20}, 20, []int{30, 50, 70}},
		{"un enfant à gauche", []int{50, 30, 20}, 30, []int{20, 50}},
		{"un enfant à droite", []int{50, 70, 80}, 70, []int{50, 80}},
		{"deux enfants", []int{50, 30, 70, 20, 40, 60, 80}, 30, []int{20, 40, 50, 60, 70, 80}},
		{"racine à deux enfants", []int{50, 30, 70, 20, 40, 60, 80}, 50, []int{20, 30, 40, 60, 70, 80}},
		{"racine sans enfant", []int{50}, 50, []int{}},
		{"racine à un enfant", []int{50, 30}, 50, []int{30}},
		{"absent", []int{50, 30, 70}, 99, []int{30, 50, 70}},
		{"successeur profond", []int{50, 30, 80, 70, 60, 65}, 50, []int{30, 60, 65, 70, 80}},
	}
	for _, c := range cases {
		root := Delete(build(c.values...), c.remove)
		if got := InOrder(root); !slices.Equal(got, c.want) {
			t.Errorf("%s : %v, attendu %v", c.name, got, c.want)
		}
		valid(t, root)
	}
	if Delete(nil, 1) != nil {
		t.Errorf("Delete(nil) doit renvoyer nil")
	}
}

func TestDeleteCanChangeTheRoot(t *testing.T) {
	root := build(10, 5)
	newRoot := Delete(root, 10)
	if newRoot == nil || newRoot.Value != 5 {
		t.Errorf("supprimer la racine d'un arbre à un enfant renvoie l'enfant : %v", newRoot)
	}
	if Delete(build(1), 1) != nil {
		t.Errorf("supprimer l'unique nœud renvoie nil")
	}
}

func TestRandomOperationsMatchAReferenceSet(t *testing.T) {
	seed := uint32(2024)
	next := func(n int) int { seed = seed*1664525 + 1013904223; return int(seed>>16) % n }
	var root *Tree
	reference := map[int]bool{}
	for i := 0; i < 4000; i++ {
		v := next(200)
		if next(3) == 0 {
			root = Delete(root, v)
			delete(reference, v)
		} else {
			root = Insert(root, v)
			reference[v] = true
		}
		if Contains(root, v) != reference[v] {
			t.Fatalf("étape %d : Contains(%d) = %v, référence %v", i, v, Contains(root, v), reference[v])
		}
		if i%250 == 0 {
			valid(t, root)
		}
	}
	want := make([]int, 0, len(reference))
	for v := range reference {
		want = append(want, v)
	}
	slices.Sort(want)
	if got := InOrder(root); !slices.Equal(got, want) {
		t.Errorf("contenu final différent de la référence (%d valeurs attendues, %d obtenues)", len(want), len(got))
	}
	if Size(root) != len(reference) {
		t.Errorf("Size = %d, attendu %d", Size(root), len(reference))
	}
	valid(t, root)
}

func TestWalkStopsEarly(t *testing.T) {
	root := build(50, 30, 70, 20, 40, 60, 80)
	var seen []int
	Walk(root, func(v int) bool {
		seen = append(seen, v)
		return v < 50
	})
	if !slices.Equal(seen, []int{20, 30, 40, 50}) {
		t.Errorf("Walk doit s'arrêter dès que visit renvoie false : %v", seen)
	}
	count := 0
	Walk(root, func(int) bool { count++; return true })
	if count != 7 {
		t.Errorf("Walk complet : %d visites", count)
	}
	Walk(nil, func(int) bool { t.Error("aucune visite sur un arbre vide"); return true })
}

func TestFromSortedIsBalanced(t *testing.T) {
	for n, wantHeight := range map[int]int{0: 0, 1: 1, 2: 2, 3: 2, 7: 3, 8: 4, 15: 4, 16: 5, 100: 7, 1000: 10} {
		values := make([]int, n)
		for i := range values {
			values[i] = i * 3
		}
		original := slices.Clone(values)
		root := FromSorted(values)
		if got := Height(root); got != wantHeight {
			t.Errorf("FromSorted(%d valeurs) : hauteur %d, attendu %d", n, got, wantHeight)
		}
		if got := InOrder(root); !slices.Equal(got, original) && n > 0 {
			t.Errorf("FromSorted(%d valeurs) : contenu inattendu", n)
		}
		if !slices.Equal(values, original) {
			t.Errorf("FromSorted a modifié sa slice d'entrée")
		}
		valid(t, root)
	}
}

func TestCloneIsDeep(t *testing.T) {
	original := build(50, 30, 70, 20, 40)
	copyOfTree := Clone(original)
	if copyOfTree == original || !Equal(original, copyOfTree) {
		t.Fatalf("la copie doit être un autre arbre, égal à l'original")
	}
	copyOfTree.Left.Value = 999
	copyOfTree.Right = Insert(copyOfTree.Right, 75)
	if original.Left.Value != 30 || Contains(original, 75) {
		t.Errorf("modifier la copie a modifié l'original : copie profonde attendue")
	}
	if Clone(nil) != nil {
		t.Errorf("Clone(nil) doit renvoyer nil")
	}
}

func TestEqual(t *testing.T) {
	a := build(2, 1, 3)
	if !Equal(a, build(2, 1, 3)) || !Equal(nil, nil) {
		t.Errorf("arbres identiques")
	}
	if Equal(a, build(2, 1)) || Equal(a, nil) || Equal(nil, a) {
		t.Errorf("tailles différentes")
	}
	// Mêmes valeurs, formes différentes : pas égaux.
	if Equal(build(1, 2, 3), build(2, 1, 3)) {
		t.Errorf("Equal compare la forme, pas seulement l'ensemble de valeurs")
	}
	if Equal(build(2, 1, 3), build(2, 1, 4)) {
		t.Errorf("valeurs différentes")
	}
}
