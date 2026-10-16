package service

import (
	"strings"
	"testing"
	"time"

	"btd/backend/internal/content"
)

func TestLevels(t *testing.T) {
	for level, want := range map[int]int{1: 0, 2: 100, 3: 300, 4: 600} {
		if got := XPForLevel(level); got != want {
			t.Errorf("XPForLevel(%d) = %d, attendu %d", level, got, want)
		}
	}
	for xp, want := range map[int]int{0: 1, 99: 1, 100: 2, 650: 4} {
		if got := LevelForXP(xp); got != want {
			t.Errorf("LevelForXP(%d) = %d, attendu %d", xp, got, want)
		}
	}
}

func TestHintPenalty(t *testing.T) {
	cases := []struct{ base, hints, want int }{{50, 0, 50}, {50, 1, 40}, {50, 10, 20}, {70, 1, 56}}
	for _, c := range cases {
		if got := ExerciseXP(c.base, c.hints); got != c.want {
			t.Errorf("ExerciseXP(%d, %d) = %d, attendu %d", c.base, c.hints, got, c.want)
		}
	}
}

func oct(d int) time.Time { return Date(2026, time.October, d) }

func TestStreak(t *testing.T) {
	today := oct(10)
	cases := []struct {
		days []time.Time
		want int
	}{
		{nil, 0},
		{[]time.Time{oct(10), oct(9), oct(7)}, 2},
		{[]time.Time{oct(9), oct(8)}, 2}, // hier compte encore
		{[]time.Time{oct(7)}, 0},
	}
	for _, c := range cases {
		if got := Streak(c.days, today); got != c.want {
			t.Errorf("Streak(%v) = %d, attendu %d", c.days, got, c.want)
		}
	}
}

func TestLongestStreak(t *testing.T) {
	if LongestStreak(nil) != 0 {
		t.Error("aucun jour : 0")
	}
	if got := LongestStreak([]time.Time{oct(1), oct(2), oct(3), oct(7), oct(8)}); got != 3 {
		t.Errorf("attendu 3, reçu %d", got)
	}
	if got := LongestStreak([]time.Time{oct(1), oct(1)}); got != 1 {
		t.Errorf("doublons ignorés : attendu 1, reçu %d", got)
	}
}

func TestIntensityAndActivityStart(t *testing.T) {
	for _, c := range []struct{ total, peak, want int }{{0, 10, 0}, {1, 10, 1}, {10, 10, 4}, {6, 10, 3}} {
		if got := Intensity(c.total, c.peak); got != c.want {
			t.Errorf("Intensity(%d, %d) = %d, attendu %d", c.total, c.peak, got, c.want)
		}
	}
	// Samedi 10 oct. 2026 : 26 semaines commencent un lundi.
	start := ActivityStart(oct(10), 26)
	if start.Weekday() != time.Monday || oct(10).Sub(start) != (25*7+5)*24*time.Hour {
		t.Errorf("début du graphe : %v", start)
	}
}

func TestQuizGrading(t *testing.T) {
	idx, err := content.Load("../../../content")
	if err != nil {
		t.Fatal(err)
	}
	byID := map[string]content.QuizQuestion{}
	for _, q := range idx.Quizzes["java-ch01-l01-quiz"].Questions {
		byID[q.ID] = q
	}
	multiple := byID["q6"]
	cases := []struct {
		q      content.QuizQuestion
		answer any
		want   bool
	}{
		{byID["q2"], "true\ntrue", true},
		{byID["q2"], "  true\ntrue\n", true},
		{byID["q2"], "true\nfalse", false},
		{byID["q5"], 1.0, true},
		{multiple, []any{1.0, 0.0}, true},
		{multiple, []any{0.0}, false},
		{multiple, "pas une liste", false},
	}
	for _, c := range cases {
		got, err := IsCorrect(c.q, c.answer)
		if err != nil || got != c.want {
			t.Errorf("%s avec %v : %v (%v), attendu %v", c.q.ID, c.answer, got, err, c.want)
		}
	}
	if _, err := IsCorrect(content.QuizQuestion{Type: "free"}, "x"); err == nil {
		t.Error("une question free ne se corrige pas automatiquement")
	}
}

func goJSON(tests ...[2]string) string {
	var lines []string
	for _, tc := range tests {
		name, status := tc[0], tc[1]
		lines = append(lines, `{"Action":"run","Test":"`+name+`"}`)
		if status == "fail" {
			lines = append(lines, `{"Action":"output","Test":"`+name+`","Output":"    x_test.go:9: mauvais résultat\n"}`)
		}
		lines = append(lines, `{"Action":"`+status+`","Test":"`+name+`"}`)
	}
	return strings.Join(lines, "\n")
}

func TestParseGoTestJSON(t *testing.T) {
	r := ParseGoTestJSON(goJSON([2]string{"TestA", "pass"}, [2]string{"TestB", "fail"}), 1, false, 10)
	if r.Passed || len(r.Tests) != 2 || r.Tests[0].Status != "pass" || r.Tests[1].Status != "fail" {
		t.Fatalf("rapport inattendu : %+v", r)
	}
	if !strings.Contains(r.Tests[1].Output, "mauvais résultat") || r.Tests[0].Output != "" {
		t.Errorf("seuls les tests en échec gardent leur sortie : %+v", r.Tests)
	}
}

func TestParseBuildError(t *testing.T) {
	raw := `{"ImportPath":"lab","Action":"build-output","Output":"./x.go:3:1: syntax error\n"}` + "\n" +
		`{"ImportPath":"lab","Action":"build-fail"}` + "\nFAIL\tlab [build failed]\n"
	r := ParseGoTestJSON(raw, 1, false, 10)
	if r.Passed || !strings.Contains(r.BuildOutput, "syntax error") || !strings.Contains(r.BuildOutput, "build failed") {
		t.Errorf("erreur de compilation attendue : %+v", r)
	}
}

func TestTestCommand(t *testing.T) {
	ex := &content.Exercise{Language: "go", TestCommand: "go test ./... && go test ./other", Checks: []string{"race"}}
	if got := testCommand(ex); got != "go test -json -race ./... && go test ./other" {
		t.Errorf("seule la première commande prend les drapeaux : %q", got)
	}
}

func TestEditableOnly(t *testing.T) {
	ex := &content.Exercise{FilesEditable: []string{"a.go"}}
	err := editableOnly(ex, map[string]string{"b.go": "", "tests/x.go": ""})
	if err == nil || err.Error() != "fichiers non modifiables : ['b.go', 'tests/x.go']" {
		t.Errorf("message : %v", err)
	}
	err = editableOnly(ex, map[string]string{"a.go": strings.Repeat("x", MaxFileBytes+1)})
	if err == nil || !strings.Contains(err.Error(), "dépasse 200000 octets") {
		t.Errorf("fichier trop gros : %v", err)
	}
}
