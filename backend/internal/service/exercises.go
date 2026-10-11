package service

import (
	"context"
	"io/fs"
	"maps"
	"os"
	"path/filepath"
	"regexp"
	"slices"
	"time"

	"btd/backend/internal/content"
	"btd/backend/internal/model"
	"btd/backend/internal/repository"
)

// Exercices : fichiers affichés dans l'IDE, brouillons, indices et exécution des tests.

const MaxFileBytes = 200_000

var goTest = regexp.MustCompile(`\bgo test\b`)

func readDir(root string) (map[string]string, error) {
	files := map[string]string{}
	err := filepath.WalkDir(root, func(p string, d fs.DirEntry, err error) error {
		if err != nil || d.IsDir() {
			return err
		}
		raw, err := os.ReadFile(p)
		if err != nil {
			return err
		}
		rel, _ := filepath.Rel(root, p)
		files[filepath.ToSlash(rel)] = string(raw)
		return nil
	})
	return files, err
}

// testCommand ajoute -json (et -race si demandé) à la première commande `go test`.
func testCommand(ex *content.Exercise) string {
	cmd := ex.TestCommand
	if ex.Language != "go" {
		return cmd
	}
	flags := "-json"
	if slices.Contains(ex.Checks, "race") {
		flags += " -race"
	}
	if loc := goTest.FindStringIndex(cmd); loc != nil {
		cmd = cmd[:loc[0]] + "go test " + flags + cmd[loc[1]:]
	}
	return cmd
}

func (s *Service) exercise(id string) (*content.Exercise, error) {
	ex := s.Content.Exercises[id]
	if ex == nil {
		return nil, errorf(NotFound, "exercice introuvable")
	}
	return ex, nil
}

type Workspace struct {
	Editable      map[string]string `json:"editable"`
	Readonly      map[string]string `json:"readonly"`
	HintsTotal    int               `json:"hints_total"`
	HintsRevealed []string          `json:"hints_revealed"`
	Attempts      int               `json:"attempts"`
	Passed        bool              `json:"passed"`
}

type CheckView struct {
	ID    string `json:"id"`
	Label string `json:"label"`
}

type ExerciseView struct {
	ID           string                `json:"id"`
	Title        string                `json:"title"`
	Role         string                `json:"role"`
	Kind         string                `json:"kind"`
	Language     string                `json:"language"`
	Difficulty   int                   `json:"difficulty"`
	XP           int                   `json:"xp"`
	ChapterID    string                `json:"chapter_id"`
	LessonID     *string               `json:"lesson_id"`
	Concepts     []string              `json:"concepts"`
	Instructions string                `json:"instructions"`
	Milestones   []content.Map         `json:"milestones"`
	Rubric       []content.Map         `json:"rubric"`
	Source       *content.Source       `json:"source"`
	Palette      []content.PaletteItem `json:"palette"`
	Checks       []CheckView           `json:"checks"`
	Worksheet    *content.Worksheet    `json:"worksheet"`
	Debrief      string                `json:"debrief"` // dévoilé une fois l'exercice réussi
	Workspace    Workspace             `json:"workspace"`
}

func (s *Service) Exercise(ctx context.Context, id string) (*ExerciseView, error) {
	ex, err := s.exercise(id)
	if err != nil {
		return nil, err
	}
	ws, err := s.workspace(ctx, ex)
	if err != nil {
		return nil, err
	}
	checks := []CheckView{}
	for _, c := range ex.DiagramChecks {
		checks = append(checks, CheckView{c.ID, c.Label})
	}
	if ex.Worksheet != nil {
		checks = CheckViews(ex.Worksheet)
	}
	debrief := ""
	if ws.Passed {
		debrief = ex.Debrief
	}
	return &ExerciseView{
		ID: ex.ID, Title: ex.Title, Role: ex.Role, Kind: ex.Kind, Language: ex.Language, Difficulty: ex.Difficulty,
		XP: ex.XP, ChapterID: ex.ChapterID, LessonID: optional(ex.LessonID), Concepts: ex.Concepts,
		Instructions: ex.Instructions, Milestones: ex.Milestones, Rubric: ex.Rubric, Source: ex.Source,
		Palette: ex.Palette, Checks: checks, Worksheet: ex.Worksheet, Debrief: debrief, Workspace: *ws,
	}, nil
}

// workspace est ce que l'IDE affiche : fichiers modifiables (brouillon ou starter) et fichiers en lecture seule.
func (s *Service) workspace(ctx context.Context, ex *content.Exercise) (*Workspace, error) {
	progress, err := s.repos().Progress.ExerciseProgress(ctx, ex.ID, false)
	if err != nil {
		return nil, err
	}
	starter, err := readDir(filepath.Join(ex.Path, "starter"))
	if err != nil {
		return nil, err
	}
	editable := map[string]string{}
	for _, name := range ex.FilesEditable {
		if body, ok := progress.Draft[name]; ok {
			editable[name] = body
		} else {
			editable[name] = starter[name]
		}
	}
	readonly := map[string]string{}
	for name, body := range starter {
		if !slices.Contains(ex.FilesEditable, name) {
			readonly[name] = body
		}
	}
	// Les règles d'un diagramme et le spec d'une fiche sont envoyés à part (Checks, Worksheet) ; le corrigé jamais.
	if ex.Kind != "diagram" && ex.Kind != "worksheet" {
		tests, err := readDir(filepath.Join(ex.Path, "tests"))
		if err != nil {
			return nil, err
		}
		for name, body := range tests {
			readonly["tests/"+name] = body
		}
	}
	return &Workspace{
		Editable: editable, Readonly: readonly, HintsTotal: len(ex.Hints),
		HintsRevealed: ex.Hints[:min(progress.HintsRevealed, len(ex.Hints))], Attempts: progress.Attempts,
		Passed: progress.PassedAt != nil,
	}, nil
}

type SandboxItem struct {
	ID         string          `json:"id"`
	Title      string          `json:"title"`
	Kind       string          `json:"kind"`
	Difficulty int             `json:"difficulty"`
	XP         int             `json:"xp"`
	Course     Ref             `json:"course"`
	Source     *content.Source `json:"source"`
	Passed     bool            `json:"passed"`
	Attempts   int             `json:"attempts"`
}

// Sandbox liste les exercices de l'atelier, avec l'état de chacun.
func (s *Service) Sandbox(ctx context.Context) ([]SandboxItem, error) {
	progress, err := s.repos().Progress.AllExerciseProgress(ctx)
	if err != nil {
		return nil, err
	}
	out := []SandboxItem{}
	for _, id := range s.Content.Sandbox {
		ex := s.Content.Exercises[id]
		p := progress[id]
		out = append(out, SandboxItem{
			ID: ex.ID, Title: ex.Title, Kind: ex.Kind, Difficulty: ex.Difficulty, XP: ex.XP,
			Course: Ref{ex.CourseID, s.Content.Courses[ex.CourseID].Title}, Source: ex.Source,
			Passed: p.PassedAt != nil, Attempts: p.Attempts,
		})
	}
	return out, nil
}

// updateProgress verrouille la progression de l'exercice, la modifie et l'enregistre.
func (s *Service) updateProgress(ctx context.Context, id string, fn func(r repository.Repos, p *model.ExerciseProgress) error) error {
	return s.store.InTx(ctx, func(r repository.Repos) error {
		p, err := r.Progress.ExerciseProgress(ctx, id, true)
		if err != nil {
			return err
		}
		if err := fn(r, &p); err != nil {
			return err
		}
		return r.Progress.SaveExerciseProgress(ctx, p)
	})
}

func (s *Service) SaveDraft(ctx context.Context, id string, files map[string]string) error {
	ex, err := s.exercise(id)
	if err != nil {
		return err
	}
	if err := editableOnly(ex, files); err != nil {
		return err
	}
	return s.updateProgress(ctx, ex.ID, func(_ repository.Repos, p *model.ExerciseProgress) error {
		p.Draft = files
		return nil
	})
}

func (s *Service) Reset(ctx context.Context, id string) error {
	ex, err := s.exercise(id)
	if err != nil {
		return err
	}
	return s.updateProgress(ctx, ex.ID, func(_ repository.Repos, p *model.ExerciseProgress) error {
		p.Draft = nil
		return nil
	})
}

type Hints struct {
	Hints      []string `json:"hints"`
	HintsTotal int      `json:"hints_total"`
}

func (s *Service) RevealHint(ctx context.Context, id string) (*Hints, error) {
	ex, err := s.exercise(id)
	if err != nil {
		return nil, err
	}
	revealed := 0
	err = s.updateProgress(ctx, ex.ID, func(_ repository.Repos, p *model.ExerciseProgress) error {
		if p.HintsRevealed < len(ex.Hints) {
			p.HintsRevealed++
		}
		revealed = min(p.HintsRevealed, len(ex.Hints))
		return nil
	})
	if err != nil {
		return nil, err
	}
	return &Hints{Hints: ex.Hints[:revealed], HintsTotal: len(ex.Hints)}, nil
}

type RunReport struct {
	TestReport
	XPAwarded int    `json:"xp_awarded"`
	Debrief   string `json:"debrief"`
}

// Run exécute les tests sur le code soumis et enregistre la tentative.
func (s *Service) Run(ctx context.Context, id string, files map[string]string) (*RunReport, error) {
	ex, err := s.exercise(id)
	if err != nil {
		return nil, err
	}
	if err := editableOnly(ex, files); err != nil {
		return nil, err
	}
	var report TestReport
	switch ex.Kind {
	case "diagram":
		if report, err = checkDiagram(ex, files); err != nil {
			return nil, err
		}
	case "worksheet":
		if report, err = checkWorksheet(ex, files); err != nil {
			return nil, err
		}
	default:
		starter, err := readDir(filepath.Join(ex.Path, "starter"))
		if err != nil {
			return nil, err
		}
		tests, err := readDir(filepath.Join(ex.Path, "tests"))
		if err != nil {
			return nil, err
		}
		toRun := maps.Clone(starter)
		maps.Copy(toRun, files)
		maps.Copy(toRun, tests)
		raw, err := s.runner.Run(ctx, ex.Language, toRun, testCommand(ex), ex.TimeoutS)
		if err != nil {
			return nil, err
		}
		report = ParseGoTestJSON(raw.Output, raw.ExitCode, raw.TimedOut, raw.DurationMs)
	}

	xp := 0
	err = s.updateProgress(ctx, ex.ID, func(r repository.Repos, p *model.ExerciseProgress) error {
		p.Attempts++
		p.Draft = files
		if report.Passed {
			if p.PassedAt == nil {
				p.PassedAt = new(s.now())
			}
			var err error
			if xp, err = r.Progress.AwardXP(ctx, "exercise", ex.ID, ExerciseXP(ex.XP, p.HintsRevealed)); err != nil {
				return err
			}
		}
		return r.Progress.AddRun(ctx, model.ExerciseRun{
			ExerciseID: ex.ID, Passed: report.Passed, DurationMs: report.DurationMs, Files: files, Report: report,
		})
	})
	if err != nil {
		return nil, err
	}
	debrief := ""
	if report.Passed {
		debrief = ex.Debrief
	}
	return &RunReport{TestReport: report, XPAwarded: xp, Debrief: debrief}, nil
}

// checkWorksheet : une fiche ne s'exécute pas, on corrige ses réponses sans passer par le runner.
func checkWorksheet(ex *content.Exercise, files map[string]string) (TestReport, error) {
	started := time.Now()
	answers, err := ParseAnswers(files["answers.json"])
	if err != nil {
		return TestReport{}, errorf(Invalid, "%s", err)
	}
	report := EvaluateWorksheet(specOf(ex), answers)
	report.DurationMs = time.Since(started).Milliseconds()
	return report, nil
}

// Preview calcule les métriques en direct des tuners d'une fiche, sans compter de tentative ni d'XP.
func (s *Service) Preview(_ context.Context, id string, files map[string]string) (map[string]TunerPreview, error) {
	ex, err := s.exercise(id)
	if err != nil {
		return nil, err
	}
	if ex.Worksheet == nil {
		return nil, errorf(Invalid, "cet exercice n'a pas de calcul en direct")
	}
	if err := editableOnly(ex, files); err != nil {
		return nil, err
	}
	answers, err := ParseAnswers(files["answers.json"])
	if err != nil {
		return nil, errorf(Invalid, "%s", err)
	}
	return PreviewWorksheet(ex.Worksheet, answers), nil
}

// checkDiagram : un diagramme ne s'exécute pas, on vérifie ses règles sans passer par le runner.
func checkDiagram(ex *content.Exercise, files map[string]string) (TestReport, error) {
	started := time.Now()
	raw, ok := files["diagram.json"]
	if !ok {
		raw = "{}"
	}
	g, err := ParseGraph(raw)
	if err != nil {
		return TestReport{}, errorf(Invalid, "%s", err)
	}
	report, err := EvaluateDiagram(g, ex.DiagramChecks, PaletteLabels(ex.Palette))
	report.DurationMs = time.Since(started).Milliseconds()
	return report, err
}

func editableOnly(ex *content.Exercise, files map[string]string) error {
	var unknown []string
	for name := range files {
		if !slices.Contains(ex.FilesEditable, name) {
			unknown = append(unknown, name)
		}
	}
	if len(unknown) > 0 {
		slices.Sort(unknown)
		return errorf(Invalid, "fichiers non modifiables : %s", pyList(unknown))
	}
	for _, name := range slices.Sorted(maps.Keys(files)) {
		if len(files[name]) > MaxFileBytes {
			return errorf(Invalid, "%s dépasse %d octets", name, MaxFileBytes)
		}
	}
	return nil
}
