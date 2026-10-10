package lab

import "testing"

func TestParseIntLiteral(t *testing.T) {
	cases := []struct {
		in   string
		want int64
		why  string
	}{
		{"0", 0, "zéro seul est un littéral décimal valide"},
		{"42", 42, "décimal simple"},
		{"1_000_000", 1000000, "les _ séparent les milliers"},
		{"0b1010_1010", 170, "binaire avec séparateur"},
		{"0B11", 3, "le préfixe accepte la majuscule"},
		{"0o755", 493, "octal moderne : 7*64 + 5*8 + 5"},
		{"0O17", 15, "le préfixe 0O accepte la majuscule"},
		{"0755", 493, "un zéro initial sans lettre est de l'octal"},
		{"0xDEAD_BEEF", 3735928559, "hexadécimal, majuscules, séparateur"},
		{"0xff", 255, "hexadécimal en minuscules"},
		{"9223372036854775807", 9223372036854775807, "la valeur maximale d'un int64 doit passer"},
	}
	for _, c := range cases {
		got, err := ParseIntLiteral(c.in)
		if err != nil {
			t.Errorf("ParseIntLiteral(%q) a renvoyé l'erreur %v — %s", c.in, err, c.why)
			continue
		}
		if got != c.want {
			t.Errorf("ParseIntLiteral(%q) = %d, attendu %d — %s", c.in, got, c.want, c.why)
		}
	}
}

func TestParseIntLiteralErrors(t *testing.T) {
	cases := []struct{ in, why string }{
		{"", "une chaîne vide n'est pas un littéral"},
		{"-5", "le signe est un opérateur, pas une partie du littéral"},
		{"+5", "le signe est un opérateur, pas une partie du littéral"},
		{"1__0", "deux _ d'affilée sont interdits"},
		{"_1", "un _ ne peut pas commencer le littéral"},
		{"1_", "un _ ne peut pas terminer le littéral"},
		{"0x", "un préfixe sans chiffre n'est pas un littéral"},
		{"0b", "un préfixe sans chiffre n'est pas un littéral"},
		{"0b102", "2 n'est pas un chiffre binaire"},
		{"08", "8 n'est pas un chiffre octal : le zéro initial rend le littéral octal"},
		{"0o9", "9 n'est pas un chiffre octal"},
		{"0xG1", "G n'est pas un chiffre hexadécimal"},
		{"12abc", "des lettres ne sont pas des chiffres décimaux"},
		{"3.14", "un flottant n'est pas un littéral entier"},
		{" 7", "les espaces ne font pas partie d'un littéral"},
		{"9223372036854775808", "dépasse int64 d'une unité"},
		{"0xFFFFFFFFFFFFFFFF", "dépasse int64"},
	}
	for _, c := range cases {
		if got, err := ParseIntLiteral(c.in); err == nil {
			t.Errorf("ParseIntLiteral(%q) = %d sans erreur — %s", c.in, got, c.why)
		}
	}
}
