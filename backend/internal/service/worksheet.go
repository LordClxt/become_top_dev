package service

// Fiches interactives (kind: worksheet) : l'élève remplit des blocs (nombres, choix, ordre, tableau, rangement, curseurs),
// le backend compare à solution/answers.json et rend un rapport au même format que les tests.
// Aucun code n'est exécuté et rien n'est envoyé au runner.

import (
	"encoding/json"
	"fmt"
	"math"
	"os"
	"path/filepath"
	"regexp"
	"slices"
	"strconv"
	"strings"

	"btd/backend/internal/content"
	"btd/backend/internal/expr"
)

// WorksheetSpec regroupe ce qu'il faut pour corriger une fiche.
type WorksheetSpec struct {
	Sheet    *content.Worksheet
	Feedback *content.WorksheetFeedback
	Solution map[string]any
}

// specOf renvoie la fiche d'un exercice déjà chargé.
func specOf(ex *content.Exercise) WorksheetSpec {
	return WorksheetSpec{ex.Worksheet, ex.WorksheetFeedback, ex.WorksheetAnswers}
}

// ParseAnswers lit answers.json.
func ParseAnswers(raw string) (map[string]any, error) {
	if strings.TrimSpace(raw) == "" {
		return map[string]any{}, nil
	}
	var m map[string]any
	if err := json.Unmarshal([]byte(raw), &m); err != nil {
		return nil, fmt.Errorf("réponses illisibles : %w", err)
	}
	if m == nil {
		m = map[string]any{}
	}
	return m, nil
}

// CheckViews liste ce que la fiche vérifie, avec le même libellé que les cas de test du rapport.
func CheckViews(ws *content.Worksheet) []CheckView {
	var out []CheckView
	for _, b := range ws.Blocks {
		if b.Type == "tuner" {
			for _, g := range b.Goals {
				out = append(out, CheckView{b.ID + "." + g.ID, g.Label})
			}
			continue
		}
		out = append(out, CheckView{b.ID, b.Title})
	}
	return out
}

// EvaluateWorksheet corrige les réponses de l'élève.
func EvaluateWorksheet(spec WorksheetSpec, answers map[string]any) TestReport {
	report := TestReport{Passed: true, Tests: []TestCase{}}
	add := func(name, wrong string) {
		tc := TestCase{Name: name, Status: "pass"}
		if wrong != "" {
			tc.Status, tc.Output, report.Passed = "fail", wrong, false
		}
		report.Tests = append(report.Tests, tc)
	}
	for _, b := range spec.Sheet.Blocks {
		fb := spec.Feedback.Blocks[b.ID]
		given, answered := answers[b.ID]
		if b.Type == "tuner" {
			for _, g := range evalTuner(b, fb, answers) {
				add(g.label, g.problem)
			}
			continue
		}
		if !answered || given == nil {
			add(b.Title, "Pas encore de réponse.")
			continue
		}
		want := spec.Solution[b.ID]
		var problem string
		switch b.Type {
		case "number":
			problem = checkNumber(fb, given, want)
		case "choice":
			problem = checkChoice(fb, given, want)
		case "multi":
			problem = checkMulti(b, fb, given, want)
		case "order":
			problem = checkOrder(b, fb, given, want)
		case "match":
			problem = checkMatch(b, fb, given, want)
		case "table":
			problem = checkTable(b, fb, given, want)
		}
		add(b.Title, problem)
	}
	return report
}

func wrongMsg(fb content.WSBlockFeedback, fallback string) string {
	if fb.Wrong != "" {
		return fb.Wrong
	}
	return fallback
}

func toFloat(v any) (float64, bool) {
	switch t := v.(type) {
	case float64:
		return t, !math.IsNaN(t) && !math.IsInf(t, 0)
	case string:
		f, err := strconv.ParseFloat(strings.ReplaceAll(strings.TrimSpace(t), ",", "."), 64)
		return f, err == nil && !math.IsNaN(f) && !math.IsInf(f, 0)
	}
	return 0, false
}

func within(a, b float64, tol *content.WSTolerance) bool {
	rel, abs := 0.001, 1e-9
	if tol != nil {
		rel, abs = tol.Rel, tol.Abs
	}
	return math.Abs(a-b) <= math.Max(abs, rel*math.Max(math.Abs(a), math.Abs(b)))+1e-12
}

func checkNumber(fb content.WSBlockFeedback, given, want any) string {
	g, ok := toFloat(given)
	if !ok {
		return "La réponse doit être un nombre."
	}
	w, _ := toFloat(want)
	if within(g, w, fb.Tolerance) {
		return ""
	}
	return wrongMsg(fb, "Ce n'est pas la bonne valeur.")
}

func checkChoice(fb content.WSBlockFeedback, given, want any) string {
	g, _ := given.(string)
	if g == want.(string) {
		return ""
	}
	if g == "" {
		return "Pas encore de réponse."
	}
	if msg, ok := fb.Options[g]; ok {
		return msg
	}
	return wrongMsg(fb, "Ce n'est pas le bon choix.")
}

func stringSet(v any) (map[string]bool, bool) {
	list, ok := v.([]any)
	if !ok {
		return nil, false
	}
	out := map[string]bool{}
	for _, e := range list {
		s, ok := e.(string)
		if !ok {
			return nil, false
		}
		out[s] = true
	}
	return out, true
}

func labelOf(opts []content.WSOption, id string) string {
	for _, o := range opts {
		if o.ID == id {
			return o.Label
		}
	}
	return id
}

func checkMulti(b content.WSBlock, fb content.WSBlockFeedback, given, want any) string {
	g, ok := stringSet(given)
	if !ok {
		return "Réponse illisible."
	}
	w, _ := stringSet(want)
	var extra []string
	missing := 0
	for id := range g {
		if !w[id] {
			extra = append(extra, id)
		}
	}
	for id := range w {
		if !g[id] {
			missing++
		}
	}
	if len(extra) == 0 && missing == 0 {
		return ""
	}
	slices.Sort(extra)
	var parts []string
	if missing > 0 {
		parts = append(parts, fmt.Sprintf("Il manque %d élément(s) à cocher.", missing))
	}
	for _, id := range extra {
		if msg, ok := fb.Options[id]; ok {
			parts = append(parts, fmt.Sprintf("« %s » : %s", labelOf(b.Options, id), msg))
		} else {
			parts = append(parts, fmt.Sprintf("« %s » n'a pas sa place ici.", labelOf(b.Options, id)))
		}
	}
	return strings.Join(parts, " ")
}

func checkOrder(b content.WSBlock, fb content.WSBlockFeedback, given, want any) string {
	list, ok := given.([]any)
	wantList := want.([]any)
	if !ok || len(list) != len(wantList) {
		return "Place tous les éléments dans l'ordre."
	}
	for i := range wantList {
		if list[i] != wantList[i] {
			id, _ := list[i].(string)
			msg := fmt.Sprintf("L'élément n°%d (« %s ») n'est pas à sa place.", i+1, labelOf(b.Items, id))
			if extra, ok := fb.Options[id]; ok {
				msg += " " + extra
			}
			return msg
		}
	}
	return ""
}

func checkMatch(b content.WSBlock, fb content.WSBlockFeedback, given, want any) string {
	g, ok := given.(map[string]any)
	if !ok {
		return "Réponse illisible."
	}
	w := want.(map[string]any)
	var wrong []string
	for _, it := range b.Items {
		if g[it.ID] == w[it.ID] {
			continue
		}
		label := "« " + it.Label + " »"
		switch {
		case g[it.ID] == nil:
			label += " n'est pas rangé"
		default:
			label += " est mal rangé"
			if msg, ok := fb.Options[it.ID]; ok {
				label += " (" + msg + ")"
			}
		}
		wrong = append(wrong, label)
	}
	if len(wrong) == 0 {
		return ""
	}
	return strings.Join(wrong, " ; ") + "."
}

var spaces = regexp.MustCompile(`\s+`)

func normCell(v any) string {
	var s string
	switch t := v.(type) {
	case string:
		s = t
	case float64:
		s = strconv.FormatFloat(t, 'f', -1, 64)
	default:
		s = fmt.Sprint(t)
	}
	return strings.ToLower(spaces.ReplaceAllString(strings.TrimSpace(s), " "))
}

func sameCell(g, w any, tol *content.WSTolerance) bool {
	gf, gok := toFloat(g)
	wf, wok := toFloat(w)
	if gok && wok {
		return within(gf, wf, tol)
	}
	return normCell(g) == normCell(w)
}

func checkTable(b content.WSBlock, fb content.WSBlockFeedback, given, want any) string {
	g, ok := given.(map[string]any)
	if !ok {
		return "Réponse illisible."
	}
	w := want.(map[string]any)
	rowLabel := map[string]string{}
	for _, r := range b.Rows {
		rowLabel[r.ID] = r.Label
	}
	colLabel := map[string]string{}
	for _, c := range b.Columns {
		colLabel[c.ID] = c.Label
	}
	var wrong []string
	for _, r := range b.Rows {
		for _, c := range b.Columns {
			key := r.ID + "." + c.ID
			wv, needed := w[key]
			if !needed {
				continue
			}
			gv, filled := g[key]
			if filled && gv != "" && sameCell(gv, wv, fb.Tolerance) {
				continue
			}
			cell := fmt.Sprintf("%s / %s", rowLabel[r.ID], colLabel[c.ID])
			if msg, ok := fb.Options[key]; ok && filled && gv != "" {
				cell += " (" + msg + ")"
			}
			wrong = append(wrong, cell)
		}
	}
	if len(wrong) == 0 {
		return ""
	}
	if len(wrong) > 6 {
		return fmt.Sprintf("%d case(s) à corriger, par exemple : %s.", len(wrong), strings.Join(wrong[:3], " ; "))
	}
	return "À corriger : " + strings.Join(wrong, " ; ") + "."
}

// --- tuner -------------------------------------------------------------------------------------------------

type goalResult struct {
	label   string
	problem string // "" si la contrainte est satisfaite
}

// TunerPreview est l'état en direct d'un tuner : métriques calculées et contraintes satisfaites.
type TunerPreview struct {
	Metrics map[string]float64 `json:"metrics"`
	Goals   map[string]bool    `json:"goals"`
	Error   string             `json:"error,omitempty"`
}

func tunerParams(b content.WSBlock, answers map[string]any) map[string]float64 {
	vars := map[string]float64{}
	given, _ := answers[b.ID].(map[string]any)
	for _, p := range b.Params {
		v := p.Default
		if f, ok := toFloat(given[p.ID]); ok {
			v = f
		}
		vars[p.ID] = math.Min(math.Max(v, p.Min), p.Max)
	}
	return vars
}

// computeTuner évalue les métriques puis les contraintes. Les expressions ont été validées au chargement.
func computeTuner(b content.WSBlock, answers map[string]any) (TunerPreview, map[string]error) {
	vars := tunerParams(b, answers)
	out := TunerPreview{Metrics: map[string]float64{}, Goals: map[string]bool{}}
	errs := map[string]error{}
	for _, m := range b.Metrics {
		e, _ := expr.Parse(m.Expr)
		v, err := e.Eval(vars)
		if err != nil {
			errs[m.ID] = err
			out.Error = fmt.Sprintf("%s : %v", m.Label, err)
			vars[m.ID] = 0
			continue
		}
		vars[m.ID] = v
		out.Metrics[m.ID] = v
	}
	for _, g := range b.Goals {
		e, _ := expr.Parse(g.Expr)
		v, err := e.Eval(vars)
		if err != nil {
			errs[g.ID] = err
			continue
		}
		out.Goals[g.ID] = v != 0
	}
	return out, errs
}

func evalTuner(b content.WSBlock, fb content.WSBlockFeedback, answers map[string]any) []goalResult {
	preview, errs := computeTuner(b, answers)
	var out []goalResult
	for _, g := range b.Goals {
		r := goalResult{label: g.Label}
		switch {
		case errs[g.ID] != nil:
			r.problem = fmt.Sprintf("Calcul impossible : %v.", errs[g.ID])
		case !preview.Goals[g.ID]:
			r.problem = "Contrainte non satisfaite."
			if msg, ok := fb.Goals[g.ID]; ok {
				r.problem = msg
			}
		}
		out = append(out, r)
	}
	return out
}

// PreviewWorksheet calcule les métriques de chaque tuner de la fiche pour les réponses données (sans tentative).
func PreviewWorksheet(ws *content.Worksheet, answers map[string]any) map[string]TunerPreview {
	out := map[string]TunerPreview{}
	for _, b := range ws.Blocks {
		if b.Type == "tuner" {
			p, _ := computeTuner(b, answers)
			out[b.ID] = p
		}
	}
	return out
}

// VerifyWorksheetSide corrige le answers.json de solution/ ou starter/ d'un exercice (utilisé par verify_lab.sh).
func VerifyWorksheetSide(labDir, side string, spec WorksheetSpec) (TestReport, error) {
	raw, err := os.ReadFile(filepath.Join(labDir, side, "answers.json"))
	if err != nil {
		return TestReport{}, err
	}
	answers, err := ParseAnswers(string(raw))
	if err != nil {
		return TestReport{}, fmt.Errorf("%s : %w", side, err)
	}
	return EvaluateWorksheet(spec, answers), nil
}
