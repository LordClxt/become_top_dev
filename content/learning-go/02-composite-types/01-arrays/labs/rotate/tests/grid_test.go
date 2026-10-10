package lab

import "testing"

func TestRotateClockwise(t *testing.T) {
	in := Grid{{1, 2, 3}, {4, 5, 6}, {7, 8, 9}}
	want := Grid{{7, 4, 1}, {8, 5, 2}, {9, 6, 3}}
	if got := RotateClockwise(in); got != want {
		t.Errorf("RotateClockwise(%v) = %v, attendu %v", in, got, want)
	}
}

func TestRotateDoesNotModifyInput(t *testing.T) {
	in := Grid{{1, 2, 3}, {4, 5, 6}, {7, 8, 9}}
	before := in
	RotateClockwise(in)
	if in != before {
		t.Errorf("la grille d'entrée a changé : %v — elle doit rester %v", in, before)
	}
}

func TestFourRotationsIsIdentity(t *testing.T) {
	in := Grid{{0, 1, 0}, {2, 0, 3}, {0, 4, 5}}
	g := in
	for i := 0; i < 4; i++ {
		g = RotateClockwise(g)
	}
	if g != in {
		t.Errorf("après 4 rotations, on obtient %v au lieu de %v", g, in)
	}
}

func TestRotateAsymmetric(t *testing.T) {
	in := Grid{{1, 0, 0}, {0, 0, 0}, {0, 0, 0}}
	want := Grid{{0, 0, 1}, {0, 0, 0}, {0, 0, 0}}
	if got := RotateClockwise(in); got != want {
		t.Errorf("le coin haut-gauche doit aller en haut à droite : obtenu %v, attendu %v", got, want)
	}
}
