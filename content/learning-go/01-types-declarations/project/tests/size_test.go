package lab

import (
	"errors"
	"math"
	"testing"
)

func TestM1ParseSize(t *testing.T) {
	cases := []struct {
		in   string
		want int64
		why  string
	}{
		{"512", 512, "sans unité : des octets"},
		{"512B", 512, "unité B"},
		{"0", 0, "zéro"},
		{"0B", 0, "zéro octet"},
		{"10KB", 10_000, "KB est décimal (×1000)"},
		{"10KiB", 10_240, "KiB est binaire (×1024)"},
		{"3MB", 3_000_000, "mégaoctets décimaux"},
		{"2GiB", 2_147_483_648, "gibioctets : tient dans un int64 mais pas dans un int32"},
		{"1.5KB", 1_500, "décimale exacte"},
		{"1.5KiB", 1_536, "1,5 × 1024"},
		{"0.5KiB", 512, "demi kibioctet"},
		{"1.25KiB", 1_280, "deux décimales"},
		{"2.5KB", 2_500, "décimale exacte"},
		{"1.0B", 1, "une décimale nulle est acceptée"},
		{"007KB", 7_000, "les zéros de tête sont tolérés"},
		{"9223372036854775807", math.MaxInt64, "le maximum d'un int64, sans unité"},
		{"9007199254740991KiB", 9_223_372_036_854_774_784, "très grand mais valide"},
	}
	for _, c := range cases {
		got, err := ParseSize(c.in)
		if err != nil || got != c.want {
			t.Errorf("ParseSize(%q) = (%d, %v), attendu %d — %s", c.in, got, err, c.want, c.why)
		}
	}
}

func TestM1ParseSizeErrors(t *testing.T) {
	cases := []struct {
		in   string
		want error
		why  string
	}{
		{"", ErrFormat, "chaîne vide"},
		{"KB", ErrFormat, "pas de nombre"},
		{".5KB", ErrFormat, "partie entière manquante"},
		{"1.KB", ErrFormat, "partie décimale vide"},
		{"1.5.2KB", ErrFormat, "deux points"},
		{"-1KB", ErrFormat, "pas de signe"},
		{" 1KB", ErrFormat, "pas d'espace de tête"},
		{"1kb", ErrUnit, "les unités sont sensibles à la casse"},
		{"1TB", ErrUnit, "TB n'est pas géré"},
		{"1 KB", ErrUnit, "pas d'espace avant l'unité"},
		{"1.5B", ErrFraction, "un demi-octet n'existe pas"},
		{"0.1KiB", ErrFraction, "102,4 octets n'est pas entier"},
		{"1.1234567891KB", ErrFraction, "plus de neuf décimales"},
		{"9223372036854775808", ErrTooLarge, "dépasse int64 d'une unité"},
		{"9007199254740993KiB", ErrTooLarge, "le produit dépasse int64"},
		{"9223372036854775807KB", ErrTooLarge, "le produit dépasse int64"},
		{"8589934592GiB", ErrTooLarge, "2^33 × 2^30 = 2^63"},
	}
	for _, c := range cases {
		if got, err := ParseSize(c.in); !errors.Is(err, c.want) {
			t.Errorf("ParseSize(%q) = (%d, %v), attendu l'erreur %v — %s", c.in, got, err, c.want, c.why)
		}
	}
}

func TestM2FormatSize(t *testing.T) {
	cases := []struct {
		in   int64
		want string
		why  string
	}{
		{0, "0 B", "zéro"},
		{1, "1 B", "un octet"},
		{1023, "1023 B", "juste sous le kibioctet"},
		{1024, "1.0 KiB", "un kibioctet"},
		{1536, "1.5 KiB", "une décimale"},
		{1_048_575, "1023.9 KiB", "la décimale est tronquée, pas arrondie : 1023,999 → 1023.9"},
		{1 << 20, "1.0 MiB", "un mébioctet"},
		{5 << 30, "5.0 GiB", "gibioctets"},
		{1 << 40, "1.0 TiB", "tébioctet"},
		{1 << 50, "1.0 PiB", "pébioctet"},
		{math.MaxInt64, "7.9 EiB", "le maximum d'un int64 : attention aux débordements en calculant la décimale"},
		{-1536, "-1.5 KiB", "tailles négatives : le signe précède"},
		{-1, "-1 B", "moins un octet"},
		{math.MinInt64, "-8.0 EiB", "le minimum d'un int64 n'a pas d'opposé positif"},
	}
	for _, c := range cases {
		if got := FormatSize(c.in); got != c.want {
			t.Errorf("FormatSize(%d) = %q, attendu %q — %s", c.in, got, c.want, c.why)
		}
	}
}

func TestM3Percent(t *testing.T) {
	cases := []struct {
		used, limit int64
		want        float64
		why         string
	}{
		{50, 200, 25, "cas simple"},
		{1, 3, 100.0 / 3, "résultat non entier : une division entière donnerait 0"},
		{300, 200, 150, "dépassement de la limite"},
		{0, 100, 0, "rien d'utilisé"},
		{5, 0, 0, "limite nulle : 0 plutôt que +Inf"},
		{0, 0, 0, "0/0 donnerait NaN"},
		{5, -10, 0, "limite négative"},
	}
	for _, c := range cases {
		got := Percent(c.used, c.limit)
		if math.IsNaN(got) || math.Abs(got-c.want) > 1e-9 {
			t.Errorf("Percent(%d, %d) = %v, attendu %v — %s", c.used, c.limit, got, c.want, c.why)
		}
	}
}

func TestM3Level(t *testing.T) {
	cases := []struct {
		used, limit int64
		want        string
		why         string
	}{
		{0, 100, "ok", "vide"},
		{79, 100, "ok", "juste sous le seuil"},
		{80, 100, "warn", "le seuil est inclus"},
		{4, 5, "warn", "80 % exactement avec d'autres nombres"},
		{99, 100, "warn", "juste sous la limite"},
		{100, 100, "full", "la limite est atteinte"},
		{250, 100, "full", "au-delà de la limite"},
		{10, 0, "unlimited", "limite nulle"},
		{10, -1, "unlimited", "limite négative"},
		{math.MaxInt64 - 1, math.MaxInt64, "warn", "au-delà de 2^53, float64 ne distingue plus used de limit : compare en entiers, sans multiplier"},
	}
	for _, c := range cases {
		if got := Level(c.used, c.limit); got != c.want {
			t.Errorf("Level(%d, %d) = %q, attendu %q — %s", c.used, c.limit, got, c.want, c.why)
		}
	}
}
