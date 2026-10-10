package lab

import (
	"slices"
	"testing"
)

func TestRuneOffsets(t *testing.T) {
	cases := []struct {
		in   string
		want []RuneAt
		why  string
	}{
		{"", []RuneAt{}, "string vide"},
		{"go", []RuneAt{{0, 'g'}, {1, 'o'}}, "ASCII : un octet par rune"},
		{"apple_π!", []RuneAt{{0, 'a'}, {1, 'p'}, {2, 'p'}, {3, 'l'}, {4, 'e'}, {5, '_'}, {6, 'π'}, {8, '!'}}, "π occupe deux octets : le décalage saute de 6 à 8"},
		{"héllo", []RuneAt{{0, 'h'}, {1, 'é'}, {3, 'l'}, {4, 'l'}, {5, 'o'}}, "é occupe deux octets"},
		{"a世b", []RuneAt{{0, 'a'}, {1, '世'}, {4, 'b'}}, "un idéogramme occupe trois octets"},
		{"a\xffb", []RuneAt{{0, 'a'}, {1, '�'}, {2, 'b'}}, "un octet invalide devient U+FFFD et avance d'un octet"},
	}
	for _, c := range cases {
		if got := RuneOffsets(c.in); !slices.Equal(got, c.want) {
			t.Errorf("RuneOffsets(%q) = %v, attendu %v — %s", c.in, got, c.want, c.why)
		}
	}
}

func TestFirstRepeat(t *testing.T) {
	cases := []struct {
		in     string
		r      rune
		offset int
		ok     bool
		why    string
	}{
		{"abcb", 'b', 3, true, "b est vu une deuxième fois en position 3"},
		{"héé", 'é', 3, true, "le décalage compte des octets : h=0, é=1, é=3"},
		{"aa", 'a', 1, true, "répétition immédiate"},
		{"abcabc", 'a', 3, true, "la première rune à se répéter est a, pas b ni c"},
		{"abc", 0, 0, false, "aucune répétition"},
		{"", 0, 0, false, "string vide"},
		{"abAB", 0, 0, false, "la casse compte : a et A sont deux runes différentes"},
		{"π世π", 'π', 5, true, "π (2 octets) + 世 (3 octets) = la deuxième π commence à l'octet 5"},
	}
	for _, c := range cases {
		r, offset, ok := FirstRepeat(c.in)
		if r != c.r || offset != c.offset || ok != c.ok {
			t.Errorf("FirstRepeat(%q) = (%q, %d, %v), attendu (%q, %d, %v) — %s", c.in, r, offset, ok, c.r, c.offset, c.ok, c.why)
		}
	}
}

func TestDoubleAll(t *testing.T) {
	xs := []int{1, 2, 3, -4, 0}
	DoubleAll(xs)
	if want := []int{2, 4, 6, -8, 0}; !slices.Equal(xs, want) {
		t.Errorf("après DoubleAll, xs = %v, attendu %v — la valeur du range est une copie : modifie xs[i]", xs, want)
	}
	DoubleAll(nil) // ne doit pas paniquer
}

func TestWordCounts(t *testing.T) {
	cases := []struct {
		in   string
		want []WordCount
		why  string
	}{
		{"The cat. the Dog! the cat?", []WordCount{{"the", 3}, {"cat", 2}, {"dog", 1}}, "casse et ponctuation ignorées, tri par fréquence"},
		{"b a b a c", []WordCount{{"a", 2}, {"b", 2}, {"c", 1}}, "à fréquence égale : ordre alphabétique"},
		{"Été été ÉTÉ", []WordCount{{"été", 3}}, "la casse Unicode est ignorée aussi"},
		{"... ?! (a)", []WordCount{{"a", 1}}, "les jetons faits uniquement de ponctuation disparaissent"},
		{"", []WordCount{}, "texte vide"},
		{"  \n\t ", []WordCount{}, "que des espaces"},
		{"un deux\ntrois\tun", []WordCount{{"un", 2}, {"deux", 1}, {"trois", 1}}, "tout type d'espace sépare les mots"},
	}
	for _, c := range cases {
		if got := WordCounts(c.in); !slices.Equal(got, c.want) {
			t.Errorf("WordCounts(%q) = %v, attendu %v — %s", c.in, got, c.want, c.why)
		}
	}
}

// Le parcours d'une map est aléatoire : si le résultat ne dépendait pas d'un tri, ce test échouerait de temps en temps.
func TestWordCountsIsDeterministic(t *testing.T) {
	text := "alpha bravo charlie delta echo foxtrot golf hotel india juliet kilo lima mike november oscar papa"
	first := WordCounts(text)
	for i := 0; i < 50; i++ {
		if got := WordCounts(text); !slices.Equal(got, first) {
			t.Fatalf("WordCounts renvoie des résultats différents d'un appel à l'autre : %v puis %v — trie le résultat", first, got)
		}
	}
	if !slices.IsSortedFunc(first, func(a, b WordCount) int {
		if a.Word < b.Word {
			return -1
		}
		return 1
	}) {
		t.Errorf("à fréquence égale, les mots doivent être triés par ordre alphabétique : %v", first)
	}
}
