package lab

import (
	"slices"
	"testing"
)

// check vérifie le contenu, la longueur mémorisée et l'absence de cycle.
func check(t *testing.T, name string, l *List, want []int) {
	t.Helper()
	got := make([]int, 0, len(want))
	seen := 0
	for n := l.Head; n != nil; n = n.Next {
		got = append(got, n.Value)
		if seen++; seen > len(want)+5 {
			t.Fatalf("%s : la liste ne se termine pas (cycle ?) après %d maillons", name, seen)
		}
	}
	if !slices.Equal(got, want) {
		t.Errorf("%s : contenu %v, attendu %v", name, got, want)
	}
	if l.Len != len(want) {
		t.Errorf("%s : Len = %d, attendu %d", name, l.Len, len(want))
	}
}

func TestNewListAndToSlice(t *testing.T) {
	check(t, "NewList(1,2,3)", NewList(1, 2, 3), []int{1, 2, 3})
	check(t, "NewList()", NewList(), []int{})
	if got := ToSlice(NewList(4, 5, 6)); !slices.Equal(got, []int{4, 5, 6}) {
		t.Errorf("ToSlice = %v", got)
	}
	if got := ToSlice(NewList()); got == nil || len(got) != 0 {
		t.Errorf("ToSlice d'une liste vide doit renvoyer une slice vide non nil : %#v", got)
	}
}

func TestPushPop(t *testing.T) {
	l := NewList()
	Push(l, 1)
	Push(l, 2)
	Push(l, 3)
	check(t, "après trois Push", l, []int{3, 2, 1})

	for _, want := range []int{3, 2, 1} {
		v, ok := Pop(l)
		if !ok || v != want {
			t.Fatalf("Pop = (%d, %v), attendu (%d, true)", v, ok, want)
		}
	}
	check(t, "après avoir tout dépilé", l, []int{})
	if l.Head != nil {
		t.Errorf("une liste vide doit avoir Head == nil")
	}
	if v, ok := Pop(l); ok || v != 0 {
		t.Errorf("Pop d'une liste vide = (%d, %v)", v, ok)
	}
}

func TestAppend(t *testing.T) {
	l := NewList()
	Append(l, 1)
	check(t, "Append sur liste vide", l, []int{1})
	Append(l, 2)
	Append(l, 3)
	check(t, "après trois Append", l, []int{1, 2, 3})
	Push(l, 0)
	Append(l, 4)
	check(t, "mélange Push et Append", l, []int{0, 1, 2, 3, 4})
}

func TestContains(t *testing.T) {
	l := NewList(5, 6, 7)
	for v, want := range map[int]bool{5: true, 6: true, 7: true, 8: false, 0: false} {
		if got := Contains(l, v); got != want {
			t.Errorf("Contains(%d) = %v", v, got)
		}
	}
	if Contains(NewList(), 1) {
		t.Errorf("une liste vide ne contient rien")
	}
}

func TestRemove(t *testing.T) {
	cases := []struct {
		name  string
		start []int
		v     int
		ok    bool
		want  []int
	}{
		{"tête", []int{1, 2, 3}, 1, true, []int{2, 3}},
		{"milieu", []int{1, 2, 3}, 2, true, []int{1, 3}},
		{"queue", []int{1, 2, 3}, 3, true, []int{1, 2}},
		{"seul élément", []int{9}, 9, true, []int{}},
		{"absent", []int{1, 2, 3}, 4, false, []int{1, 2, 3}},
		{"première occurrence seulement", []int{1, 2, 1, 2}, 2, true, []int{1, 1, 2}},
		{"liste vide", []int{}, 1, false, []int{}},
	}
	for _, c := range cases {
		l := NewList(c.start...)
		if ok := Remove(l, c.v); ok != c.ok {
			t.Errorf("%s : Remove = %v, attendu %v", c.name, ok, c.ok)
		}
		check(t, c.name, l, c.want)
	}
}

func TestReverse(t *testing.T) {
	cases := [][]int{{}, {1}, {1, 2}, {1, 2, 3}, {1, 2, 3, 4, 5, 6}}
	for _, values := range cases {
		l := NewList(values...)
		Reverse(l)
		want := slices.Clone(values)
		slices.Reverse(want)
		check(t, "Reverse", l, want)
	}
}

func TestReverseRelinksTheSameNodes(t *testing.T) {
	l := NewList(1, 2, 3)
	first, last := l.Head, l.Head.Next.Next
	Reverse(l)
	if l.Head != last || last.Next == nil || last.Next.Next != first || first.Next != nil {
		t.Errorf("Reverse doit relier les maillons existants (la queue devient la tête), pas en recréer")
	}
	big := NewList(make([]int, 1000)...)
	if a := testing.AllocsPerRun(20, func() { Reverse(big) }); a != 0 {
		t.Errorf("Reverse a alloué %.0f fois : elle ne doit créer aucun maillon", a)
	}
}

func TestInsertSorted(t *testing.T) {
	l := NewList()
	for _, v := range []int{5, 1, 9, 3, 7, 3, 0, 10} {
		InsertSorted(l, v)
	}
	check(t, "insertions successives", l, []int{0, 1, 3, 3, 5, 7, 9, 10})

	stable := NewList(1, 2, 2, 3)
	InsertSorted(stable, 2)
	check(t, "égal à des valeurs existantes", stable, []int{1, 2, 2, 2, 3})
	// Le nouveau 2 se place APRÈS les 2 existants : le maillon d'origine reste le premier.
	original := stable.Head.Next
	if original.Value != 2 || original.Next.Value != 2 {
		t.Errorf("structure inattendue")
	}
}

func TestNilListsDoNotPanic(t *testing.T) {
	var l *List
	Push(l, 1)
	Append(l, 1)
	Reverse(l)
	InsertSorted(l, 1)
	if v, ok := Pop(l); ok || v != 0 {
		t.Errorf("Pop(nil) = (%d, %v)", v, ok)
	}
	if Contains(l, 1) || Remove(l, 1) {
		t.Errorf("une liste nil est vide")
	}
	if got := ToSlice(l); len(got) != 0 {
		t.Errorf("ToSlice(nil) = %v", got)
	}
}

func TestLongListsStayConsistent(t *testing.T) {
	l := NewList()
	var want []int
	for i := 0; i < 500; i++ {
		switch i % 4 {
		case 0:
			Push(l, i)
			want = slices.Insert(want, 0, i)
		case 1:
			Append(l, i)
			want = append(want, i)
		case 2:
			if i%3 == 0 && len(want) > 0 {
				Remove(l, want[len(want)/2])
				want = slices.Delete(want, len(want)/2, len(want)/2+1)
			}
		case 3:
			if v, ok := Pop(l); ok {
				if v != want[0] {
					t.Fatalf("Pop = %d, attendu %d", v, want[0])
				}
				want = want[1:]
			}
		}
	}
	check(t, "après 500 opérations mélangées", l, want)
}
