package service

import (
	"testing"

	"btd/backend/internal/content"
)

func testSpec() WorksheetSpec {
	opts := []content.WSOption{{ID: "a", Label: "A"}, {ID: "b", Label: "B"}, {ID: "c", Label: "C"}}
	return WorksheetSpec{
		Sheet: &content.Worksheet{Blocks: []content.WSBlock{
			{ID: "num", Type: "number", Title: "Nombre"},
			{ID: "ch", Type: "choice", Title: "Choix", Options: opts},
			{ID: "mu", Type: "multi", Title: "Multi", Options: opts},
			{ID: "or", Type: "order", Title: "Ordre", Items: opts},
			{ID: "ma", Type: "match", Title: "Rangement", Items: opts, Categories: []content.WSOption{{ID: "x", Label: "X"}, {ID: "y", Label: "Y"}}},
			{ID: "ta", Type: "table", Title: "Table",
				Columns: []content.WSColumn{{ID: "k", Label: "Clé"}, {ID: "v", Label: "Valeur"}},
				Rows:    []content.WSRow{{ID: "r1", Label: "L1", Cells: map[string]string{"k": "a"}}, {ID: "r2", Label: "L2"}}},
			{ID: "tu", Type: "tuner", Title: "Tuner",
				Params:  []content.WSParam{{ID: "m", Label: "Bits", Min: 1000, Max: 20000, Step: 100, Default: 1000}, {ID: "k", Label: "k", Min: 1, Max: 20, Step: 1, Default: 1}},
				Metrics: []content.WSMetric{{ID: "fpr", Label: "FPR", Expr: "pow(1 - exp(-k * 1000 / m), k)"}},
				Goals:   []content.WSGoal{{ID: "low", Label: "Moins de 1 %", Expr: "fpr < 0.01"}, {ID: "small", Label: "Moins de 12 000 bits", Expr: "m <= 12000"}}},
		}},
		Feedback: &content.WorksheetFeedback{Blocks: map[string]content.WSBlockFeedback{
			"num": {Tolerance: &content.WSTolerance{Rel: 0.01}, Wrong: "Revois la formule."},
			"ch":  {Options: map[string]string{"b": "B oublie le coût d'écriture."}},
			"mu":  {Options: map[string]string{"c": "C n'influence pas le résultat."}},
			"or":  {Options: map[string]string{"c": "C vient après la validation."}},
			"ma":  {Options: map[string]string{"b": "B est un cas particulier."}},
			"ta":  {Options: map[string]string{"r2.v": "Pense aux pierres tombales."}},
			"tu":  {Goals: map[string]string{"low": "Trop de faux positifs."}},
		}},
		Solution: map[string]any{
			"num": 42.0, "ch": "a", "mu": []any{"a", "b"}, "or": []any{"b", "a", "c"},
			"ma": map[string]any{"a": "x", "b": "y", "c": "x"}, "ta": map[string]any{"r1.v": "10", "r2.v": "7.5"},
			"tu": map[string]any{"m": 10000.0, "k": 7.0},
		},
	}
}

func goodAnswers() map[string]any {
	return map[string]any{
		"num": 42.2, "ch": "a", "mu": []any{"b", "a"}, "or": []any{"b", "a", "c"},
		"ma": map[string]any{"a": "x", "b": "y", "c": "x"}, "ta": map[string]any{"r1.v": " 10 ", "r2.v": "7,5"},
		"tu": map[string]any{"m": 10000.0, "k": 7.0},
	}
}

func byName(r TestReport) map[string]TestCase {
	m := map[string]TestCase{}
	for _, tc := range r.Tests {
		m[tc.Name] = tc
	}
	return m
}

func TestWorksheetSolutionPassesAndEmptyFails(t *testing.T) {
	spec := testSpec()
	if r := EvaluateWorksheet(spec, goodAnswers()); !r.Passed {
		t.Errorf("les bonnes réponses doivent passer : %+v", r.Tests)
	}
	if r := EvaluateWorksheet(spec, spec.Solution); !r.Passed {
		t.Errorf("la solution doit passer : %+v", r.Tests)
	}
	r := EvaluateWorksheet(spec, map[string]any{})
	if r.Passed {
		t.Fatal("un starter vide ne doit pas passer")
	}
	for _, tc := range r.Tests {
		if tc.Name == "Moins de 12 000 bits" {
			continue // les curseurs par défaut la satisfont déjà : seul l'ensemble doit échouer
		}
		if tc.Status != "fail" {
			t.Errorf("%s devrait échouer sans réponse (curseurs aux valeurs par défaut) : %+v", tc.Name, tc)
		}
	}
	if len(r.Tests) != 8 { // 6 blocs + 2 contraintes
		t.Errorf("%d cas, attendu 8", len(r.Tests))
	}
}

func TestWorksheetFeedback(t *testing.T) {
	spec := testSpec()
	a := goodAnswers()
	a["num"] = 50.0
	a["ch"] = "b"
	a["mu"] = []any{"a", "c"}
	a["or"] = []any{"b", "c", "a"}
	a["ma"] = map[string]any{"a": "x", "b": "x"}
	a["ta"] = map[string]any{"r1.v": "10", "r2.v": "8"}
	a["tu"] = map[string]any{"m": 5000.0, "k": 1.0}
	r := byName(EvaluateWorksheet(spec, a))
	for name, want := range map[string]string{
		"Nombre":               "Revois la formule.",
		"Choix":                "B oublie le coût d'écriture.",
		"Moins de 1 %":         "Trop de faux positifs.",
		"Moins de 12 000 bits": "",
	} {
		tc := r[name]
		if want == "" && tc.Status != "pass" {
			t.Errorf("%s doit passer : %+v", name, tc)
		}
		if want != "" && (tc.Status != "fail" || tc.Output != want) {
			t.Errorf("%s : %+v, attendu l'explication %q", name, tc, want)
		}
	}
	for name, contains := range map[string]string{
		"Multi":     "C n'influence pas le résultat",
		"Ordre":     "C vient après la validation",
		"Rangement": "« B » est mal rangé (B est un cas particulier.)",
		"Table":     "Pense aux pierres tombales",
	} {
		if tc := r[name]; tc.Status != "fail" || !contains2(tc.Output, contains) {
			t.Errorf("%s : %+v, attendu qu'il contienne %q", name, tc, contains)
		}
	}
	if tc := r["Multi"]; !contains2(tc.Output, "Il manque 1") {
		t.Errorf("Multi : %+v", tc)
	}
	if tc := r["Rangement"]; !contains2(tc.Output, "« C » n'est pas rangé") {
		t.Errorf("Rangement : %+v", tc)
	}
}

func contains2(s, sub string) bool {
	return len(sub) == 0 || (len(s) >= len(sub) && indexOf(s, sub) >= 0)
}

func indexOf(s, sub string) int {
	for i := 0; i+len(sub) <= len(s); i++ {
		if s[i:i+len(sub)] == sub {
			return i
		}
	}
	return -1
}

func TestWorksheetDoesNotLeakTheSolution(t *testing.T) {
	spec := testSpec()
	a := goodAnswers()
	a["num"] = 7.0
	a["or"] = []any{"a", "b", "c"}
	for _, tc := range EvaluateWorksheet(spec, a).Tests {
		if contains2(tc.Output, "42") {
			t.Errorf("%s révèle la réponse : %q", tc.Name, tc.Output)
		}
	}
}

func TestWorksheetNumberFormats(t *testing.T) {
	spec := testSpec()
	for _, v := range []any{"42", " 42,1 ", 42.0, 41.9} {
		a := goodAnswers()
		a["num"] = v
		if r := byName(EvaluateWorksheet(spec, a))["Nombre"]; r.Status != "pass" {
			t.Errorf("%v devrait passer (tolérance 1 %%) : %+v", v, r)
		}
	}
	for _, v := range []any{"abc", true, 43.0} {
		a := goodAnswers()
		a["num"] = v
		if r := byName(EvaluateWorksheet(spec, a))["Nombre"]; r.Status != "fail" {
			t.Errorf("%v devrait échouer", v)
		}
	}
}

func TestTunerPreview(t *testing.T) {
	spec := testSpec()
	p := PreviewWorksheet(spec.Sheet, map[string]any{"tu": map[string]any{"m": 10000.0, "k": 7.0}})["tu"]
	if f := p.Metrics["fpr"]; f < 0.0081 || f > 0.0083 {
		t.Errorf("fpr = %v", f)
	}
	if !p.Goals["low"] || !p.Goals["small"] {
		t.Errorf("contraintes : %+v", p.Goals)
	}
	// hors bornes → ramené dans les bornes, absent → défaut
	p = PreviewWorksheet(spec.Sheet, map[string]any{"tu": map[string]any{"m": 1e9}})["tu"]
	if p.Goals["small"] {
		t.Errorf("m est ramené à 20 000 : 'small' devrait être faux : %+v", p)
	}
	if _, ok := PreviewWorksheet(spec.Sheet, nil)["tu"]; !ok {
		t.Error("l'aperçu doit exister même sans réponse")
	}
}

func TestParseAnswers(t *testing.T) {
	if m, err := ParseAnswers(""); err != nil || len(m) != 0 {
		t.Errorf("%v %v", m, err)
	}
	if m, err := ParseAnswers("null"); err != nil || m == nil {
		t.Errorf("null → carte vide : %v %v", m, err)
	}
	if _, err := ParseAnswers("[1]"); err == nil {
		t.Error("un tableau n'est pas valide")
	}
}

func TestCheckViewsMatchTestNames(t *testing.T) {
	spec := testSpec()
	views := CheckViews(spec.Sheet)
	r := EvaluateWorksheet(spec, goodAnswers())
	if len(views) != len(r.Tests) {
		t.Fatalf("%d vérifications annoncées, %d cas rendus", len(views), len(r.Tests))
	}
	for i, v := range views {
		if v.Label != r.Tests[i].Name {
			t.Errorf("libellé %q ≠ nom du cas %q : le client ne pourrait pas les associer", v.Label, r.Tests[i].Name)
		}
	}
}
