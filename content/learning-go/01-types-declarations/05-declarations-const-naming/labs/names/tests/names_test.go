package lab

import (
	"slices"
	"testing"
)

func TestIsValidIdentifier(t *testing.T) {
	valid := []string{"x", "count", "indexCounter", "_", "_tmp", "a1", "π", "ａ", "naïve", "x٣", "A", "func1"}
	invalid := []string{"", "1x", "9lives", "my-var", "a b", "x.y", "for", "func", "var", "range", "x!", "é-t"}
	for _, name := range valid {
		if !IsValidIdentifier(name) {
			t.Errorf("IsValidIdentifier(%q) = false, attendu true — Go accepte les lettres et chiffres Unicode", name)
		}
	}
	for _, name := range invalid {
		if IsValidIdentifier(name) {
			t.Errorf("IsValidIdentifier(%q) = true, attendu false", name)
		}
	}
}

func TestLint(t *testing.T) {
	cases := []struct {
		name string
		want []string
		why  string
	}{
		{"count", nil, "nom court et idiomatique"},
		{"indexCounter", nil, "camelCase"},
		{"i", nil, "un nom très court est normal dans un petit scope"},
		{"_", nil, "l'identifiant blanc est toujours correct"},
		{"index_counter", []string{SnakeCase}, "snake_case"},
		{"user_ID", []string{SnakeCase}, "il y a des minuscules : c'est du snake_case, pas des majuscules"},
		{"MAX_SIZE", []string{ScreamingCase}, "constante en MAJUSCULES"},
		{"_tmp", []string{SnakeCase}, "un underscore initial n'est pas du camelCase"},
		{"ａ", []string{NonASCII}, "a pleine largeur U+FF41, indiscernable d'un a"},
		{"π", []string{NonASCII}, "valide mais non ASCII"},
		{"naïve", []string{NonASCII}, "accent"},
		{"ñ_x", []string{NonASCII, SnakeCase}, "les deux écarts, dans cet ordre"},
		{"", []string{Invalid}, "un nom vide est invalide"},
		{"9lives", []string{Invalid}, "ne peut pas commencer par un chiffre"},
		{"for", []string{Invalid}, "mot-clé"},
		{"my-var", []string{Invalid}, "le tiret n'est pas autorisé : seul Invalid est renvoyé"},
	}
	for _, c := range cases {
		got := Lint(c.name)
		if !slices.Equal(got, c.want) {
			t.Errorf("Lint(%q) = %v, attendu %v — %s", c.name, got, c.want, c.why)
		}
	}
}
