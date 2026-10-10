package lab

import (
	"slices"
	"testing"
)

func TestAnalyzeBasic(t *testing.T) {
	r := Analyze("Le chat et le chien. Le chat dort !", 2)
	if r.Words != 8 {
		t.Errorf("Words = %d, attendu 8", r.Words)
	}
	if r.UniqueWords != 5 {
		t.Errorf("UniqueWords = %d, attendu 5 (le, chat, et, chien, dort)", r.UniqueWords)
	}
	want := []WordCount{{Word: "le", Count: 3}, {Word: "chat", Count: 2}}
	if !slices.Equal(r.Top, want) {
		t.Errorf("Top = %v, attendu %v", r.Top, want)
	}
	if r.Longest != "chien" {
		t.Errorf("Longest = %q, attendu \"chien\"", r.Longest)
	}
}

func TestAnalyzeCaseInsensitive(t *testing.T) {
	r := Analyze("Go GO go", 5)
	if r.UniqueWords != 1 || len(r.Top) != 1 || r.Top[0] != (WordCount{Word: "go", Count: 3}) {
		t.Errorf("les mots doivent être comparés en minuscules : %+v", r)
	}
}

func TestAnalyzeSeparators(t *testing.T) {
	r := Analyze("l'été 2024, c'est-à-dire...", 10)
	want := []string{"à", "c", "dire", "est", "l", "été"}
	var got []string
	for _, wc := range r.Top {
		got = append(got, wc.Word)
	}
	slices.Sort(got)
	slices.Sort(want)
	if !slices.Equal(got, want) {
		t.Errorf("mots trouvés = %v, attendu %v (chiffres et ponctuation séparent les mots)", got, want)
	}
}

func TestAnalyzeTieBreakAlphabetical(t *testing.T) {
	r := Analyze("zèbre alpha mango", 3)
	want := []WordCount{{"alpha", 1}, {"mango", 1}, {"zèbre", 1}}
	if !slices.Equal(r.Top, want) {
		t.Errorf("à égalité, ordre alphabétique : Top = %v, attendu %v", r.Top, want)
	}
}

func TestAnalyzeLongestInRunes(t *testing.T) {
	// "éééé" fait 4 caractères (8 bytes), "abcde" fait 5 caractères (5 bytes).
	r := Analyze("éééé abcde", 1)
	if r.Longest != "abcde" {
		t.Errorf("Longest = %q, attendu \"abcde\" : compte les caractères, pas les bytes", r.Longest)
	}
	r = Analyze("ab cd", 1)
	if r.Longest != "ab" {
		t.Errorf("à égalité, le premier mot apparu : Longest = %q, attendu \"ab\"", r.Longest)
	}
}

func TestAnalyzeTopLimit(t *testing.T) {
	r := Analyze("a b c", 10)
	if len(r.Top) != 3 {
		t.Errorf("top plus grand que le vocabulaire : len(Top) = %d, attendu 3", len(r.Top))
	}
	r = Analyze("a b c", 0)
	if len(r.Top) != 0 {
		t.Errorf("top = 0 : len(Top) = %d, attendu 0", len(r.Top))
	}
}

func TestAnalyzeEmpty(t *testing.T) {
	r := Analyze("", 3)
	if r.Words != 0 || r.UniqueWords != 0 || len(r.Top) != 0 || r.Longest != "" {
		t.Errorf("texte vide : %+v, attendu un rapport à zéro", r)
	}
}
