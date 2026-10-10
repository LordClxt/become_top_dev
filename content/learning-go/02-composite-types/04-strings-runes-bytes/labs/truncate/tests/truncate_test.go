package lab

import (
	"testing"
	"unicode/utf8"
)

func TestPreview(t *testing.T) {
	cases := []struct {
		name string
		msg  string
		n    int
		want string
	}{
		{"ascii coupé", "Bonjour", 3, "Bon…"},
		{"ascii court", "Salut", 10, "Salut"},
		{"longueur exacte", "Salut", 5, "Salut"},
		{"accent", "Café crème", 4, "Café…"},
		{"accents exacts", "été", 3, "été"},
		{"emojis", "🙂🙂🙂", 2, "🙂🙂…"},
		{"japonais", "こんにちは世界", 5, "こんにちは…"},
		{"n nul", "abc", 0, ""},
		{"n négatif", "abc", -1, ""},
		{"vide", "", 3, ""},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got := Preview(c.msg, c.n)
			if got != c.want {
				t.Errorf("Preview(%q, %d) = %q, attendu %q — n compte des caractères, pas des bytes", c.msg, c.n, got, c.want)
			}
			if !utf8.ValidString(got) {
				t.Errorf("Preview(%q, %d) renvoie de l'UTF-8 invalide : un caractère a été coupé en deux", c.msg, c.n)
			}
		})
	}
}
