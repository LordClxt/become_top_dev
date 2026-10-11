package content

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func writeLab(t *testing.T, sheet, answers, feedback string) string {
	t.Helper()
	dir := t.TempDir()
	for name, body := range map[string]string{
		"worksheet.yaml":        sheet,
		"solution/answers.json": answers,
		"tests/feedback.yaml":   feedback,
		"starter/answers.json":  "{}",
	} {
		path := filepath.Join(dir, name)
		if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(path, []byte(body), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	return dir
}

const validSheet = `
blocks:
  - { id: n, type: number, title: "Nombre" }
  - id: c
    type: choice
    title: "Choix"
    options: [{ id: a, label: A }, { id: b, label: B }]
  - id: o
    type: order
    title: "Ordre"
    items: [{ id: x, label: X }, { id: y, label: Y }]
  - id: m
    type: match
    title: "Rangement"
    items: [{ id: x, label: X }, { id: y, label: Y }]
    categories: [{ id: k, label: K }, { id: l, label: L }]
  - id: t
    type: table
    title: "Table"
    columns: [{ id: k, label: K }, { id: v, label: V }]
    rows: [{ id: r1, label: R1, cells: { k: a } }, { id: r2, label: R2 }]
  - id: u
    type: tuner
    title: "Tuner"
    params: [{ id: p, label: P, min: 1, max: 10, step: 1, default: 1 }]
    metrics: [{ id: dbl, label: Double, expr: "p * 2" }]
    goals: [{ id: g, label: "Assez grand", expr: "dbl >= 10" }]
`

const validAnswers = `{"n": 3, "c": "a", "o": ["y", "x"], "m": {"x": "k", "y": "l"}, "t": {"r1.v": "1", "r2.k": "b", "r2.v": "2"}, "u": {"p": 6}}`

func TestLoadWorksheetValid(t *testing.T) {
	ws, _, answers, err := LoadWorksheet(writeLab(t, validSheet, validAnswers, "blocks:\n  n: { tolerance: { rel: 0.1 } }\n"))
	if err != nil {
		t.Fatal(err)
	}
	if len(ws.Blocks) != 6 || answers["c"] != "a" {
		t.Errorf("%+v %v", ws, answers)
	}
}

func TestLoadWorksheetRejects(t *testing.T) {
	cases := map[string]struct {
		sheet, answers, feedback, want string
	}{
		"réponse manquante":     {validSheet, `{"n": 3}`, "", "pas de réponse"},
		"option inconnue":       {validSheet, strings.Replace(validAnswers, `"c": "a"`, `"c": "zzz"`, 1), "", "id d'une option"},
		"ordre incomplet":       {validSheet, strings.Replace(validAnswers, `["y", "x"]`, `["y"]`, 1), "", "tous les éléments"},
		"case inconnue":         {validSheet, strings.Replace(validAnswers, `"r2.v": "2"`, `"r9.v": "2"`, 1), "", "case"},
		"curseur hors bornes":   {validSheet, strings.Replace(validAnswers, `"p": 6`, `"p": 60`, 1), "", "hors bornes"},
		"bloc inconnu en trop":  {validSheet, strings.Replace(validAnswers, `{"n": 3,`, `{"zzz": 1, "n": 3,`, 1), "", "n'est pas un bloc"},
		"feedback orphelin":     {validSheet, validAnswers, "blocks:\n  zzz: { wrong: x }\n", "n'existe pas"},
		"type inconnu":          {strings.Replace(validSheet, "type: number", "type: magic", 1), validAnswers, "", "inconnu"},
		"expression dangereuse": {strings.Replace(validSheet, `dbl >= 10`, `os.Exit(1)`, 1), validAnswers, "", "interdit"},
		"variable inconnue":     {strings.Replace(validSheet, `dbl >= 10`, `nope >= 10`, 1), validAnswers, "", "variable"},
		"id en double":          {strings.Replace(validSheet, "id: c\n", "id: n\n", 1), validAnswers, "", "double"},
	}
	for name, c := range cases {
		_, _, _, err := LoadWorksheet(writeLab(t, c.sheet, c.answers, c.feedback))
		if err == nil || !strings.Contains(err.Error(), c.want) {
			t.Errorf("%s : erreur %v, attendu qu'elle contienne %q", name, err, c.want)
		}
	}
}

func TestCatalogIsValid(t *testing.T) {
	c, err := DiagramCatalog()
	if err != nil {
		t.Fatal(err)
	}
	if len(c.Components) < 40 {
		t.Errorf("%d composants", len(c.Components))
	}
	for _, id := range []string{"client", "service", "queue", "database", "external", "cache", "redis", "postgres", "kafka", "btree-page", "zone"} {
		if _, ok := c.Component(id); !ok {
			t.Errorf("composant %s absent", id)
		}
	}
}
