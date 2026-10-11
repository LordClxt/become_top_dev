package content

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"slices"

	"btd/backend/internal/expr"
)

// Chargement et validation des fiches interactives (kind: worksheet).
//
// Une fiche, c'est :
//   - worksheet.yaml          (public) les blocs affichés à l'élève ;
//   - tests/feedback.yaml     (privé)  tolérances et explications des mauvaises réponses ;
//   - solution/answers.json   (privé)  les réponses de référence ;
//   - starter/answers.json    le point de départ (vide) ;
//   - debrief.md              dévoilé une fois l'exercice réussi.

var worksheetBlockTypes = []string{"number", "choice", "multi", "order", "match", "table", "tuner"}

// LoadWorksheet lit la fiche d'un exercice : spec public, retours privés et réponses de référence.
func LoadWorksheet(dir string) (*Worksheet, *WorksheetFeedback, map[string]any, error) {
	var ws Worksheet
	if err := readYAML(filepath.Join(dir, "worksheet.yaml"), &ws); err != nil {
		return nil, nil, nil, fmt.Errorf("%s: worksheet.yaml : %w", dir, err)
	}
	fb := &WorksheetFeedback{Blocks: map[string]WSBlockFeedback{}}
	if f := filepath.Join(dir, "tests", "feedback.yaml"); isFile(f) {
		if err := readYAML(f, fb); err != nil {
			return nil, nil, nil, err
		}
	}
	raw, err := os.ReadFile(filepath.Join(dir, "solution", "answers.json"))
	if err != nil {
		return nil, nil, nil, fmt.Errorf("%s: solution/answers.json manquant", dir)
	}
	var answers map[string]any
	if err := json.Unmarshal(raw, &answers); err != nil {
		return nil, nil, nil, fmt.Errorf("%s: solution/answers.json illisible : %w", dir, err)
	}
	if err := validateWorksheet(dir, &ws, fb, answers); err != nil {
		return nil, nil, nil, err
	}
	return &ws, fb, answers, nil
}

func validateWorksheet(dir string, ws *Worksheet, fb *WorksheetFeedback, answers map[string]any) error {
	fail := func(block, format string, a ...any) error {
		return fmt.Errorf("%s: worksheet.yaml, bloc %s : %s", dir, block, fmt.Sprintf(format, a...))
	}
	if len(ws.Blocks) == 0 {
		return fmt.Errorf("%s: worksheet.yaml sans bloc", dir)
	}
	seen := map[string]bool{}
	for i := range ws.Blocks {
		b := &ws.Blocks[i]
		if b.ID == "" || b.Title == "" {
			return fmt.Errorf("%s: worksheet.yaml : le bloc n°%d n'a pas d'id ou de titre", dir, i+1)
		}
		if seen[b.ID] {
			return fail(b.ID, "id en double")
		}
		seen[b.ID] = true
		if !slices.Contains(worksheetBlockTypes, b.Type) {
			return fail(b.ID, "type %q inconnu (%v)", b.Type, worksheetBlockTypes)
		}
		b.Options, b.Items, b.Categories = nonNil(b.Options), nonNil(b.Items), nonNil(b.Categories)
		b.Columns, b.Rows = nonNil(b.Columns), nonNil(b.Rows)
		b.Params, b.Metrics, b.Goals = nonNil(b.Params), nonNil(b.Metrics), nonNil(b.Goals)

		answer, answered := answers[b.ID]
		if !answered {
			return fail(b.ID, "pas de réponse dans solution/answers.json")
		}
		var err error
		switch b.Type {
		case "number":
			if _, ok := answer.(float64); !ok {
				err = fmt.Errorf("la réponse doit être un nombre")
			}
		case "choice":
			err = validateChoice(b, answer)
		case "multi":
			err = validateMulti(b, answer)
		case "order":
			err = validateOrder(b, answer)
		case "match":
			err = validateMatch(b, answer)
		case "table":
			err = validateTable(b, answer)
		case "tuner":
			err = validateTuner(b, answer)
		}
		if err != nil {
			return fail(b.ID, "%v", err)
		}
	}
	for id := range fb.Blocks {
		if !seen[id] {
			return fmt.Errorf("%s: tests/feedback.yaml cite le bloc %s, qui n'existe pas", dir, id)
		}
	}
	for id := range answers {
		if !seen[id] {
			return fmt.Errorf("%s: solution/answers.json contient %s, qui n'est pas un bloc", dir, id)
		}
	}
	return nil
}

func optionIDs(opts []WSOption) (map[string]bool, error) {
	ids := map[string]bool{}
	for _, o := range opts {
		if o.ID == "" || o.Label == "" {
			return nil, fmt.Errorf("une option sans id ou label")
		}
		if ids[o.ID] {
			return nil, fmt.Errorf("option %s en double", o.ID)
		}
		ids[o.ID] = true
	}
	return ids, nil
}

func validateChoice(b *WSBlock, answer any) error {
	ids, err := optionIDs(b.Options)
	if err != nil {
		return err
	}
	if len(ids) < 2 {
		return fmt.Errorf("au moins 2 options")
	}
	if s, ok := answer.(string); !ok || !ids[s] {
		return fmt.Errorf("la réponse doit être l'id d'une option")
	}
	return nil
}

func validateMulti(b *WSBlock, answer any) error {
	ids, err := optionIDs(b.Options)
	if err != nil {
		return err
	}
	if len(ids) < 2 {
		return fmt.Errorf("au moins 2 options")
	}
	list, ok := answer.([]any)
	if !ok || len(list) == 0 {
		return fmt.Errorf("la réponse doit être une liste d'ids non vide")
	}
	for _, v := range list {
		if s, ok := v.(string); !ok || !ids[s] {
			return fmt.Errorf("la réponse cite une option inconnue")
		}
	}
	return nil
}

func validateOrder(b *WSBlock, answer any) error {
	ids, err := optionIDs(b.Items)
	if err != nil {
		return err
	}
	if len(ids) < 2 {
		return fmt.Errorf("au moins 2 éléments")
	}
	list, ok := answer.([]any)
	if !ok || len(list) != len(ids) {
		return fmt.Errorf("la réponse doit lister tous les éléments, une fois chacun")
	}
	used := map[string]bool{}
	for _, v := range list {
		s, ok := v.(string)
		if !ok || !ids[s] || used[s] {
			return fmt.Errorf("la réponse doit lister tous les éléments, une fois chacun")
		}
		used[s] = true
	}
	return nil
}

func validateMatch(b *WSBlock, answer any) error {
	items, err := optionIDs(b.Items)
	if err != nil {
		return err
	}
	cats, err := optionIDs(b.Categories)
	if err != nil {
		return err
	}
	if len(items) < 2 || len(cats) < 2 {
		return fmt.Errorf("au moins 2 éléments et 2 catégories")
	}
	m, ok := answer.(map[string]any)
	if !ok || len(m) != len(items) {
		return fmt.Errorf("la réponse doit ranger chaque élément")
	}
	for item, c := range m {
		if cs, ok := c.(string); !items[item] || !ok || !cats[cs] {
			return fmt.Errorf("la réponse range %q dans une catégorie inconnue", item)
		}
	}
	return nil
}

func validateTable(b *WSBlock, answer any) error {
	if len(b.Columns) == 0 || len(b.Rows) == 0 {
		return fmt.Errorf("une table a des colonnes et des lignes")
	}
	cols := map[string]bool{}
	for _, c := range b.Columns {
		if c.ID == "" || c.Label == "" || cols[c.ID] {
			return fmt.Errorf("colonne sans id/label ou en double")
		}
		cols[c.ID] = true
	}
	want := map[string]bool{}
	rows := map[string]bool{}
	for _, r := range b.Rows {
		if r.ID == "" || rows[r.ID] {
			return fmt.Errorf("ligne sans id ou en double")
		}
		rows[r.ID] = true
		if r.Cells == nil {
			r.Cells = map[string]string{}
		}
		for c := range r.Cells {
			if !cols[c] {
				return fmt.Errorf("la ligne %s remplit une colonne inconnue (%s)", r.ID, c)
			}
		}
		for _, c := range b.Columns {
			if _, given := r.Cells[c.ID]; !given {
				want[r.ID+"."+c.ID] = true
			}
		}
	}
	if len(want) == 0 {
		return fmt.Errorf("aucune case à compléter")
	}
	m, ok := answer.(map[string]any)
	if !ok || len(m) != len(want) {
		return fmt.Errorf("la réponse doit remplir exactement les cases vides (%d attendues)", len(want))
	}
	for k, v := range m {
		if !want[k] {
			return fmt.Errorf("la réponse remplit une case inconnue ou déjà donnée (%s)", k)
		}
		if _, ok := v.(string); !ok {
			if _, ok := v.(float64); !ok {
				return fmt.Errorf("la case %s doit contenir un texte ou un nombre", k)
			}
		}
	}
	return nil
}

func validateTuner(b *WSBlock, answer any) error {
	if len(b.Params) == 0 || len(b.Goals) == 0 {
		return fmt.Errorf("un tuner a des curseurs et des contraintes")
	}
	vars := map[string]bool{}
	for _, p := range b.Params {
		switch {
		case p.ID == "" || p.Label == "" || vars[p.ID]:
			return fmt.Errorf("curseur sans id/label ou en double")
		case !(p.Min < p.Max) || p.Step <= 0 || p.Default < p.Min || p.Default > p.Max:
			return fmt.Errorf("curseur %s : bornes, pas ou défaut incohérents", p.ID)
		}
		vars[p.ID] = true
	}
	check := func(what, id, src string) error {
		e, err := expr.Parse(src)
		if err != nil {
			return fmt.Errorf("%s %s : %w", what, id, err)
		}
		for _, name := range e.Idents() {
			if !vars[name] {
				return fmt.Errorf("%s %s : variable %q inconnue (curseurs et métriques précédentes seulement)", what, id, name)
			}
		}
		return nil
	}
	for _, m := range b.Metrics {
		if m.ID == "" || m.Label == "" || vars[m.ID] {
			return fmt.Errorf("métrique sans id/label ou en double")
		}
		if err := check("métrique", m.ID, m.Expr); err != nil {
			return err
		}
		vars[m.ID] = true
	}
	goals := map[string]bool{}
	for _, g := range b.Goals {
		if g.ID == "" || g.Label == "" || goals[g.ID] {
			return fmt.Errorf("contrainte sans id/label ou en double")
		}
		goals[g.ID] = true
		if err := check("contrainte", g.ID, g.Expr); err != nil {
			return err
		}
	}
	m, ok := answer.(map[string]any)
	if !ok || len(m) != len(b.Params) {
		return fmt.Errorf("la réponse doit donner une valeur à chaque curseur")
	}
	for _, p := range b.Params {
		v, ok := m[p.ID].(float64)
		if !ok || v < p.Min || v > p.Max {
			return fmt.Errorf("curseur %s : valeur de référence absente ou hors bornes", p.ID)
		}
	}
	return nil
}
