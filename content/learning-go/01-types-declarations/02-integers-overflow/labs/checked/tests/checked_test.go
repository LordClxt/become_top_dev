package lab

import (
	"errors"
	"testing"
)

func TestAddInt8(t *testing.T) {
	cases := []struct {
		a, b     int8
		sum      int8
		overflow bool
		why      string
	}{
		{100, 27, 127, false, "127 est le maximum : pas de débordement"},
		{100, 28, -128, true, "128 sort de la plage et fait le tour jusqu'à -128"},
		{127, 1, -128, true, "le maximum plus un"},
		{-100, -28, -128, false, "-128 est le minimum : il tient"},
		{-100, -29, 127, true, "-129 sort de la plage par le bas"},
		{-128, -1, 127, true, "le minimum moins un"},
		{-128, 127, -1, false, "des signes opposés ne débordent jamais"},
		{0, 0, 0, false, "cas neutre"},
		{50, -100, -50, false, "des signes opposés ne débordent jamais"},
	}
	for _, c := range cases {
		sum, overflow := AddInt8(c.a, c.b)
		if sum != c.sum || overflow != c.overflow {
			t.Errorf("AddInt8(%d, %d) = (%d, %v), attendu (%d, %v) — %s", c.a, c.b, sum, overflow, c.sum, c.overflow, c.why)
		}
	}
}

func TestMulUint8(t *testing.T) {
	cases := []struct {
		a, b     uint8
		product  uint8
		overflow bool
		why      string
	}{
		{15, 17, 255, false, "255 est le maximum : il tient"},
		{16, 16, 0, true, "256 fait le tour complet et donne 0 : le résultat nul ne prouve pas l'absence de débordement"},
		{255, 2, 254, true, "510 mod 256"},
		{128, 2, 0, true, "256 mod 256"},
		{0, 200, 0, false, "multiplier par zéro ne déborde jamais (attention à la division par a)"},
		{200, 0, 0, false, "multiplier par zéro ne déborde jamais"},
		{255, 1, 255, false, "élément neutre"},
		{7, 8, 56, false, "cas courant"},
	}
	for _, c := range cases {
		product, overflow := MulUint8(c.a, c.b)
		if product != c.product || overflow != c.overflow {
			t.Errorf("MulUint8(%d, %d) = (%d, %v), attendu (%d, %v) — %s", c.a, c.b, product, overflow, c.product, c.overflow, c.why)
		}
	}
}

func TestSaturatingSubUint8(t *testing.T) {
	cases := []struct{ a, b, want uint8 }{
		{10, 3, 7}, {3, 10, 0}, {0, 0, 0}, {255, 255, 0}, {255, 0, 255}, {0, 1, 0}, {5, 5, 0},
	}
	for _, c := range cases {
		if got := SaturatingSubUint8(c.a, c.b); got != c.want {
			t.Errorf("SaturatingSubUint8(%d, %d) = %d, attendu %d — en non signé, a - b ne devient jamais négatif : il faut tester avant de soustraire", c.a, c.b, got, c.want)
		}
	}
}

func TestDivide(t *testing.T) {
	cases := []struct{ a, b, q, r int }{
		{7, 2, 3, 1},
		{-7, 2, -3, -1},
		{7, -2, -3, 1},
		{-7, -2, 3, -1},
		{0, 5, 0, 0},
		{6, 3, 2, 0},
	}
	for _, c := range cases {
		q, r, err := Divide(c.a, c.b)
		if err != nil || q != c.q || r != c.r {
			t.Errorf("Divide(%d, %d) = (%d, %d, %v), attendu (%d, %d, nil) — la division de Go tronque vers zéro", c.a, c.b, q, r, err, c.q, c.r)
		}
	}
}

func TestDivideByZero(t *testing.T) {
	defer func() {
		if r := recover(); r != nil {
			t.Fatalf("Divide(1, 0) a paniqué (%v) : renvoie ErrDivisionByZero à la place", r)
		}
	}()
	if _, _, err := Divide(1, 0); !errors.Is(err, ErrDivisionByZero) {
		t.Errorf("Divide(1, 0) a renvoyé l'erreur %v, attendu ErrDivisionByZero", err)
	}
}
