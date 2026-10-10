package lab

import (
	"math"
	"slices"
	"testing"
)

func TestApprox(t *testing.T) {
	a, b := 0.1, 0.2
	cases := []struct {
		x, y, eps float64
		want      bool
		why       string
	}{
		{a + b, 0.3, 1e-9, true, "0.1 + 0.2 vaut 0.30000000000000004 : égal à 0.3 à 1e-9 près"},
		{1, 1.1, 0.01, false, "l'écart de 0.1 dépasse la tolérance"},
		{1, 1.1, 0.2, true, "l'écart de 0.1 est dans la tolérance"},
		{5, 5, 0, true, "deux valeurs identiques sont égales même avec une tolérance nulle"},
		{math.Inf(1), math.Inf(1), 1, true, "+Inf est égal à +Inf"},
		{math.Inf(1), math.Inf(-1), 1e300, false, "+Inf n'est pas égal à -Inf, quelle que soit la tolérance"},
		{math.Inf(1), 1e308, 1e308, false, "un infini n'est proche d'aucun nombre fini"},
		{math.NaN(), math.NaN(), 1, false, "NaN n'est égal à rien"},
		{math.NaN(), 1, 1e300, false, "NaN n'est proche de rien"},
	}
	for _, c := range cases {
		if got := Approx(c.x, c.y, c.eps); got != c.want {
			t.Errorf("Approx(%v, %v, %v) = %v, attendu %v — %s", c.x, c.y, c.eps, got, c.want, c.why)
		}
	}
}

func TestParseCents(t *testing.T) {
	cases := []struct {
		in   string
		want int64
		why  string
	}{
		{"12.34", 1234, "cas nominal"},
		{"12", 1200, "sans partie décimale"},
		{"0.5", 50, "un seul chiffre après la virgule vaut des dizaines de centimes"},
		{"0.05", 5, "le zéro après la virgule compte"},
		{"0", 0, "zéro"},
		{"-1.25", -125, "montant négatif"},
		{"-0.05", -5, "négatif inférieur à un euro"},
		{"1000000.99", 100000099, "grand montant"},
		{"007.10", 710, "les zéros de tête sont tolérés"},
		{"92233720368547758.07", 9223372036854775807, "le plus grand montant représentable"},
	}
	for _, c := range cases {
		got, err := ParseCents(c.in)
		if err != nil || got != c.want {
			t.Errorf("ParseCents(%q) = (%d, %v), attendu (%d, nil) — %s", c.in, got, err, c.want, c.why)
		}
	}
}

func TestParseCentsErrors(t *testing.T) {
	for _, in := range []string{"", "abc", "1.234", "1.", ".5", "1,5", "--1", "1.2.3", " 1", "+1", "-", "1e3", "92233720368547758.08", "99999999999999999999"} {
		if got, err := ParseCents(in); err == nil {
			t.Errorf("ParseCents(%q) = %d sans erreur, une erreur était attendue", in, got)
		}
	}
}

func TestFormatCents(t *testing.T) {
	cases := map[int64]string{
		1234: "12.34", 5: "0.05", 0: "0.00", -5: "-0.05", -1234: "-12.34", 100: "1.00",
		1000000: "10000.00", math.MaxInt64: "92233720368547758.07", math.MinInt64: "-92233720368547758.08",
	}
	for in, want := range cases {
		if got := FormatCents(in); got != want {
			t.Errorf("FormatCents(%d) = %q, attendu %q", in, got, want)
		}
	}
}

func TestParseFormatRoundTrip(t *testing.T) {
	for _, cents := range []int64{0, 1, 9, 10, 99, 100, 101, 123456789, -1, -250, 999999999999} {
		text := FormatCents(cents)
		got, err := ParseCents(text)
		if err != nil || got != cents {
			t.Errorf("ParseCents(FormatCents(%d)) = (%d, %v) via %q", cents, got, err, text)
		}
	}
}

func TestSplitBill(t *testing.T) {
	cases := []struct {
		total int64
		n     int
		want  []int64
	}{
		{1000, 3, []int64{334, 333, 333}},
		{100, 4, []int64{25, 25, 25, 25}},
		{1, 3, []int64{1, 0, 0}},
		{0, 2, []int64{0, 0}},
		{10, 1, []int64{10}},
		{7, 5, []int64{2, 2, 1, 1, 1}},
	}
	for _, c := range cases {
		if got := SplitBill(c.total, c.n); !slices.Equal(got, c.want) {
			t.Errorf("SplitBill(%d, %d) = %v, attendu %v — les premières personnes paient un centime de plus", c.total, c.n, got, c.want)
		}
	}
	if got := SplitBill(100, 0); got != nil {
		t.Errorf("SplitBill(100, 0) = %v, attendu nil : on ne partage pas entre zéro personne", got)
	}
	if got := SplitBill(-100, 3); got != nil {
		t.Errorf("SplitBill(-100, 3) = %v, attendu nil : un total négatif n'est pas partagé", got)
	}
}

func TestSplitBillNeverLosesACent(t *testing.T) {
	for total := int64(0); total < 200; total++ {
		for n := 1; n < 12; n++ {
			var sum int64
			shares := SplitBill(total, n)
			for _, s := range shares {
				sum += s
			}
			if len(shares) != n || sum != total {
				t.Fatalf("SplitBill(%d, %d) = %v : somme %d, il manque ou il y a des centimes en trop", total, n, shares, sum)
			}
		}
	}
}
