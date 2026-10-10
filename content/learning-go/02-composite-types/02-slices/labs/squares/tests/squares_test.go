package lab

import (
	"slices"
	"testing"
)

func TestSquaresValues(t *testing.T) {
	cases := []struct {
		name string
		in   []int
		want []int
	}{
		{"positifs", []int{1, 2, 3}, []int{1, 4, 9}},
		{"négatifs", []int{-2, -3}, []int{4, 9}},
		{"zéro", []int{0}, []int{0}},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := Squares(c.in); !slices.Equal(got, c.want) {
				t.Errorf("Squares(%v) = %v, attendu %v", c.in, got, c.want)
			}
		})
	}
}

func TestSquaresEmpty(t *testing.T) {
	if got := Squares(nil); len(got) != 0 {
		t.Errorf("Squares(nil) doit avoir une longueur 0, obtenu %v", got)
	}
}

func TestSquaresExactCapacity(t *testing.T) {
	in := []int{1, 2, 3, 4, 5}
	got := Squares(in)
	if cap(got) != len(got) {
		t.Errorf("cap = %d mais len = %d : réserve exactement la place nécessaire avec make", cap(got), len(got))
	}
}

func TestSquaresSingleAllocation(t *testing.T) {
	in := make([]int, 1000)
	for i := range in {
		in[i] = i
	}
	allocs := testing.AllocsPerRun(20, func() { Squares(in) })
	if allocs > 1 {
		t.Errorf("%.0f allocations par appel, attendu 1 : la slice grandit encore pendant la boucle", allocs)
	}
}

func TestSquaresDoesNotModifyInput(t *testing.T) {
	in := []int{2, 3}
	Squares(in)
	if !slices.Equal(in, []int{2, 3}) {
		t.Errorf("l'entrée a été modifiée : %v", in)
	}
}
