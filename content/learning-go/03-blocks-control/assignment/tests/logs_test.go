package lab

import (
	"maps"
	"slices"
	"testing"
)

func check(t *testing.T, name string, got, want Report) {
	t.Helper()
	if got.Lines != want.Lines || got.Malformed != want.Malformed || got.Truncated != want.Truncated ||
		!maps.Equal(got.Counts, want.Counts) || !slices.Equal(got.ErrorSources, want.ErrorSources) {
		t.Errorf("%s :\n   reçu    %+v\n   attendu %+v", name, got, want)
	}
}

func TestAnalyzeBasic(t *testing.T) {
	log := `INFO api started
DEBUG db connected
WARN api slow response
ERROR db timeout after 30s
ERROR cache miss storm
INFO api request served`
	check(t, "journal simple", Analyze(log), Report{
		Lines:        6,
		Counts:       map[string]int{"INFO": 2, "DEBUG": 1, "WARN": 1, "ERROR": 2},
		ErrorSources: []string{"cache", "db"},
	})
}

func TestAnalyzeSkipsBlankAndComments(t *testing.T) {
	log := "\n# commentaire\n   \nINFO api ok\n\t# autre commentaire\n\r\nINFO api ok\r\n"
	check(t, "lignes vides et commentaires", Analyze(log), Report{
		Lines:  2,
		Counts: map[string]int{"INFO": 2},
	})
}

func TestAnalyzeAliases(t *testing.T) {
	log := "WARNING api disk 91%\nWARN api disk 95%\nFATAL db crashed\nERROR db restarted"
	check(t, "alias WARNING et FATAL", Analyze(log), Report{
		Lines:        4,
		Counts:       map[string]int{"WARN": 2, "ERROR": 2},
		ErrorSources: []string{"db"},
	})
}

func TestAnalyzeMalformedLines(t *testing.T) {
	log := `INFO api ok
INFO
oops
info api lowercase level
TRACE api unknown level
ERROR db boom`
	check(t, "lignes mal formées", Analyze(log), Report{
		Lines:        6,
		Counts:       map[string]int{"INFO": 1, "ERROR": 1},
		ErrorSources: []string{"db"},
		Malformed:    4,
	})
}

func TestAnalyzeStopsAtEnd(t *testing.T) {
	log := `INFO api one
ERROR db two
--END--
ERROR cache ignored
garbage ignored`
	check(t, "arrêt à --END--", Analyze(log), Report{
		Lines:        2,
		Counts:       map[string]int{"INFO": 1, "ERROR": 1},
		ErrorSources: []string{"db"},
		Truncated:    true,
	})
	check(t, "--END-- seul", Analyze("--END--"), Report{Counts: map[string]int{}, Truncated: true})
	check(t, "--END-- avec espaces", Analyze("INFO a b\n   --END--   \nINFO a b"), Report{
		Lines: 1, Counts: map[string]int{"INFO": 1}, Truncated: true,
	})
}

func TestAnalyzeEmpty(t *testing.T) {
	for _, log := range []string{"", "\n\n", "# rien"} {
		got := Analyze(log)
		if got.Counts == nil {
			t.Errorf("Analyze(%q).Counts est nil, attendu une map vide (utilisable sans vérification)", log)
		}
		check(t, "journal vide", got, Report{Counts: map[string]int{}})
	}
}

func TestAnalyzeErrorSourcesAreDeduplicatedAndSorted(t *testing.T) {
	log := "ERROR zeta a\nERROR alpha b\nFATAL zeta c\nERROR mid d\nERROR alpha e\nINFO other f"
	got := Analyze(log)
	if want := []string{"alpha", "mid", "zeta"}; !slices.Equal(got.ErrorSources, want) {
		t.Errorf("ErrorSources = %v, attendu %v — sans doublons et triées (l'ordre d'une map est aléatoire)", got.ErrorSources, want)
	}
	for i := 0; i < 30; i++ {
		if again := Analyze(log); !slices.Equal(again.ErrorSources, got.ErrorSources) {
			t.Fatalf("résultat non déterministe : %v puis %v", got.ErrorSources, again.ErrorSources)
		}
	}
}

func TestAnalyzeKeepsMessageWords(t *testing.T) {
	// Seuls le niveau et la source comptent ; le message peut contenir n'importe quoi, même un mot qui ressemble à un niveau.
	log := "INFO api ERROR is just a word in this message\nERROR db INFO"
	check(t, "message libre", Analyze(log), Report{
		Lines:        2,
		Counts:       map[string]int{"INFO": 1, "ERROR": 1},
		ErrorSources: []string{"db"},
	})
}
