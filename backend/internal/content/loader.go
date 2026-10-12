package content

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"regexp"
	"slices"
	"sort"
	"strings"
	"time"

	"go.yaml.in/yaml/v3"
)

var (
	frontMatter     = regexp.MustCompile(`(?s)\A---\n(.*?)\n---\n(.*)\z`)
	hintSplit       = regexp.MustCompile(`(?m)^## Hint \d+\s*$`)
	visualDirective = regexp.MustCompile(`::visual\{id="([^"]+)"\}`)
)

// Load charge et valide tout content/. Échoue bruyamment si le contenu est invalide.
func Load(root string) (*Index, error) {
	idx := &Index{
		Courses:   map[string]*Course{},
		Chapters:  map[string]*Chapter{},
		Lessons:   map[string]*Lesson{},
		Exercises: map[string]*Exercise{},
		Quizzes:   map[string]*Quiz{},
		Visuals:   map[string]*Visual{},
	}
	courseFiles, err := filepath.Glob(filepath.Join(root, "*", "course.yaml"))
	if err != nil {
		return nil, err
	}
	sort.Strings(courseFiles)
	for _, courseFile := range courseFiles {
		courseDir := filepath.Dir(courseFile)
		course := &Course{}
		if err := readYAML(courseFile, course); err != nil {
			return nil, err
		}
		if err := course.validate(courseFile); err != nil {
			return nil, err
		}
		course.Slug = filepath.Base(courseDir)
		for _, track := range course.Tracks {
			for _, slug := range track.Chapters {
				if !isFile(filepath.Join(courseDir, slug, "chapter.yaml")) {
					continue // chapitre planifié mais pas encore généré
				}
				ch, err := loadChapter(filepath.Join(courseDir, slug), course.ID, idx)
				if err != nil {
					return nil, err
				}
				idx.Chapters[ch.ID] = ch
				course.ChapterIDs = append(course.ChapterIDs, ch.ID)
			}
		}
		idx.Courses[course.ID] = course
		idx.CourseOrder = append(idx.CourseOrder, course.ID)

		labFiles, _ := filepath.Glob(filepath.Join(courseDir, "sandbox", "*", "lab.yaml"))
		sort.Strings(labFiles)
		for _, labFile := range labFiles {
			ex, err := loadExercise(filepath.Dir(labFile), "lab.yaml", "lab", "", "")
			if err != nil {
				return nil, err
			}
			ex.CourseID = course.ID
			idx.Exercises[ex.ID] = ex
			idx.Sandbox = append(idx.Sandbox, ex.ID)
		}
	}
	if err := checkReferences(idx); err != nil {
		return nil, err
	}
	if err := checkCourseRequirements(idx); err != nil {
		return nil, err
	}
	return idx, nil
}

func loadChapter(dir, courseID string, idx *Index) (*Chapter, error) {
	ch := &Chapter{}
	if err := readYAML(filepath.Join(dir, "chapter.yaml"), ch); err != nil {
		return nil, err
	}
	if err := ch.validate(filepath.Join(dir, "chapter.yaml")); err != nil {
		return nil, err
	}
	ch.Slug, ch.CourseID, ch.LessonIDs = filepath.Base(dir), courseID, []string{}
	for _, slug := range ch.Lessons {
		lessonDir := filepath.Join(dir, slug)
		if !isDir(lessonDir) {
			return nil, fmt.Errorf("%s: leçon %s déclarée mais absente", dir, slug)
		}
		lesson, err := loadLesson(lessonDir, ch.ID, idx)
		if err != nil {
			return nil, err
		}
		idx.Lessons[lesson.ID] = lesson
		ch.LessonIDs = append(ch.LessonIDs, lesson.ID)
	}

	for _, special := range []struct{ role, metaFile string }{
		{"assignment", "assignment.yaml"}, {"boss", "lab.yaml"}, {"project", "project.yaml"},
	} {
		sub := filepath.Join(dir, special.role)
		if !isFile(filepath.Join(sub, special.metaFile)) {
			continue
		}
		ex, err := loadExercise(sub, special.metaFile, special.role, ch.ID, "")
		if err != nil {
			return nil, err
		}
		idx.Exercises[ex.ID] = ex
		switch special.role {
		case "assignment":
			ch.AssignmentID = ex.ID
		case "boss":
			ch.BossID = ex.ID
		case "project":
			ch.ProjectID = ex.ID
		}
	}
	return ch, nil
}

func loadLesson(dir, chapterID string, idx *Index) (*Lesson, error) {
	file := filepath.Join(dir, "lesson.md")
	raw, err := os.ReadFile(file)
	if err != nil {
		return nil, err
	}
	m := frontMatter.FindSubmatch(raw)
	if m == nil {
		return nil, fmt.Errorf("%s: front-matter YAML manquant", file)
	}
	lesson := &Lesson{DurationMin: 15}
	if err := decodeYAML(file, m[1], lesson); err != nil {
		return nil, err
	}
	if err := lesson.validate(file); err != nil {
		return nil, err
	}

	for _, labDir := range subdirs(filepath.Join(dir, "labs")) {
		ex, err := loadExercise(labDir, "lab.yaml", "lab", chapterID, lesson.ID)
		if err != nil {
			return nil, err
		}
		idx.Exercises[ex.ID] = ex
	}
	visualFiles, _ := filepath.Glob(filepath.Join(dir, "visuals", "*", "visual.yaml"))
	sort.Strings(visualFiles)
	for _, visFile := range visualFiles {
		vis := &Visual{Status: "idea"}
		if err := readYAML(visFile, vis); err != nil {
			return nil, err
		}
		if err := vis.validate(visFile); err != nil {
			return nil, err
		}
		if vis.Status == "built" && !exists(filepath.Join(filepath.Dir(visFile), vis.Entry)) {
			return nil, fmt.Errorf("%s: entry %s introuvable", visFile, vis.Entry)
		}
		idx.Visuals[vis.ID] = vis
	}

	if quizFile := filepath.Join(dir, "quiz.yaml"); isFile(quizFile) {
		quiz := &Quiz{}
		if err := readYAML(quizFile, quiz); err != nil {
			return nil, err
		}
		if err := quiz.validate(quizFile); err != nil {
			return nil, err
		}
		quiz.LessonID = lesson.ID
		idx.Quizzes[quiz.ID] = quiz
		lesson.QuizID = quiz.ID
	}
	lesson.Flashcards = []Flashcard{}
	if cardsFile := filepath.Join(dir, "flashcards.yaml"); isFile(cardsFile) {
		var cards struct {
			Cards []Flashcard `yaml:"cards"`
		}
		if err := readYAML(cardsFile, &cards); err != nil {
			return nil, err
		}
		for _, c := range cards.Cards {
			if c.ID == "" || c.Front == "" || c.Back == "" || c.Concept == "" {
				return nil, fmt.Errorf("%s: carte incomplète (id, front, back, concept requis)", cardsFile)
			}
		}
		lesson.Flashcards = append(lesson.Flashcards, cards.Cards...)
	}

	lesson.Body, lesson.Slug, lesson.ChapterID = string(m[2]), filepath.Base(dir), chapterID
	return lesson, nil
}

func loadExercise(dir, metaFile, role, chapterID, lessonID string) (*Exercise, error) {
	metaPath := filepath.Join(dir, metaFile)
	ex := &Exercise{Difficulty: 1, TimeoutS: 30}
	if err := readYAML(metaPath, ex); err != nil {
		return nil, err
	}
	for _, sub := range []string{"starter", "solution", "tests"} {
		if !isDir(filepath.Join(dir, sub)) {
			return nil, fmt.Errorf("%s: dossier %s/ manquant", dir, sub)
		}
	}
	for _, name := range ex.FilesEditable {
		if !isFile(filepath.Join(dir, "starter", name)) {
			return nil, fmt.Errorf("%s: fichier modifiable %s absent de starter/", dir, name)
		}
	}
	if ex.Verified == nil {
		return nil, fmt.Errorf("%s: exercice non vérifié (lance verify_lab.sh)", dir)
	}

	ex.Rubric, ex.Milestones = []Map{}, []Map{}
	if f := filepath.Join(dir, "rubric.yaml"); isFile(f) {
		var r struct {
			Criteria []Map `yaml:"criteria"`
		}
		if err := readYAML(f, &r); err != nil {
			return nil, err
		}
		ex.Rubric = jsonMaps(r.Criteria)
	}
	if f := filepath.Join(dir, "milestones.yaml"); isFile(f) {
		var m struct {
			Milestones []Map `yaml:"milestones"`
		}
		if err := readYAML(f, &m); err != nil {
			return nil, err
		}
		ex.Milestones = jsonMaps(m.Milestones)
	}
	ex.DiagramChecks = []DiagramCheck{}
	if ex.Kind == "diagram" {
		checks, err := diagramChecks(dir, ex)
		if err != nil {
			return nil, err
		}
		ex.DiagramChecks = checks
	}
	if ex.Kind == "worksheet" {
		if !slices.Equal(ex.FilesEditable, []string{"answers.json"}) {
			return nil, fmt.Errorf("%s: une fiche (worksheet) n'édite que answers.json", dir)
		}
		ws, fb, answers, err := LoadWorksheet(dir)
		if err != nil {
			return nil, err
		}
		ex.Worksheet, ex.WorksheetFeedback, ex.WorksheetAnswers = ws, fb, answers
	}
	if raw, err := os.ReadFile(filepath.Join(dir, "instructions.md")); err == nil {
		ex.Instructions = string(raw)
	}
	if raw, err := os.ReadFile(filepath.Join(dir, "debrief.md")); err == nil {
		ex.Debrief = string(raw)
	}
	hints, err := readHints(filepath.Join(dir, "hints.md"))
	if err != nil {
		return nil, err
	}
	ex.Hints = hints
	ex.Role, ex.ChapterID, ex.LessonID, ex.Path = role, chapterID, lessonID, dir
	if err := ex.validate(metaPath); err != nil {
		return nil, err
	}
	return ex, nil
}

// diagramChecks lit les règles d'un exercice diagram : elles ne peuvent citer que des types de la palette.
func diagramChecks(dir string, ex *Exercise) ([]DiagramCheck, error) {
	checksFile := filepath.Join(dir, "tests", "checks.yaml")
	if !isFile(checksFile) {
		return nil, fmt.Errorf("%s: tests/checks.yaml manquant (exercice diagram)", dir)
	}
	checks, err := LoadChecks(checksFile)
	if err != nil {
		return nil, err
	}
	if len(checks) == 0 {
		return nil, fmt.Errorf("%s: aucune règle dans tests/checks.yaml", dir)
	}
	types := map[string]bool{}
	for _, p := range ex.Palette {
		types[p.Type] = true
	}
	for _, c := range checks {
		if c.Rule == "link" {
			continue // source et target y sont des noms de blocs, pas des types
		}
		for _, t := range []string{c.Source, c.Target, c.Via} {
			if t != "" && !types[t] {
				return nil, fmt.Errorf("%s: la règle %s cite le type %s, absent de la palette", dir, c.ID, t)
			}
		}
	}
	if !slices.Equal(ex.FilesEditable, []string{"diagram.json"}) {
		return nil, fmt.Errorf("%s: un exercice diagram n'édite que diagram.json", dir)
	}
	return checks, nil
}

// EdgeKinds sont les natures de flèche reconnues par l'éditeur et les règles.
var EdgeKinds = []string{"sync", "async", "replication", "read", "write"}

// validateCheck contrôle les champs requis par chaque règle.
func validateCheck(c DiagramCheck) error {
	need := func(ok bool, what string) error {
		if !ok {
			return fmt.Errorf("%s requis", what)
		}
		return nil
	}
	switch c.Rule {
	case "path", "no_edge":
		return errors.Join(need(c.Source != "", "source"), need(c.Target != "", "target"))
	case "inbound_via":
		return errors.Join(need(c.Target != "", "target"), need(c.Via != "", "via"))
	case "single_owner":
		return need(c.Target != "", "target")
	case "prop":
		return errors.Join(need(c.Source != "", "source"), need(c.Prop != "", "prop"), need(c.Value != "", "value"))
	case "edge_kind":
		if !slices.Contains(EdgeKinds, c.Kind) {
			return fmt.Errorf("kind doit valoir l'une des natures %v", EdgeKinds)
		}
		return errors.Join(need(c.Source != "", "source"), need(c.Target != "", "target"))
	case "count":
		if c.Min == nil && c.Max == nil {
			return errors.New("min ou max requis")
		}
		return need(c.Source != "", "source")
	case "in_zone":
		return errors.Join(need(c.Source != "", "source"), need(c.Target != "", "target"))
	case "tree_shape":
		return errors.Join(need(c.Source != "", "source"), need(c.Tree != nil, "tree"))
	case "link":
		return errors.Join(need(c.Source != "", "source"), need(c.Target != "", "target"), need(c.Value != "", "value"))
	}
	return nil
}

// LoadChecks lit tests/checks.yaml d'un exercice diagram.
func LoadChecks(file string) ([]DiagramCheck, error) {
	var raw struct {
		Checks []DiagramCheck `yaml:"checks"`
	}
	if err := readYAML(file, &raw); err != nil {
		return nil, err
	}
	for _, c := range raw.Checks {
		if c.ID == "" || c.Label == "" {
			return nil, fmt.Errorf("%s: règle sans id ou label", file)
		}
		if !slices.Contains([]string{"path", "no_edge", "inbound_via", "single_owner", "connected",
			"prop", "edge_kind", "count", "in_zone", "tree_shape", "link"}, c.Rule) {
			return nil, fmt.Errorf("%s: règle %s : type %q inconnu", file, c.ID, c.Rule)
		}
		if err := validateCheck(c); err != nil {
			return nil, fmt.Errorf("%s: règle %s : %w", file, c.ID, err)
		}
	}
	return raw.Checks, nil
}

// LoadDiagramLab lit la palette et les règles d'un exercice diagram, sans le reste du contenu.
func LoadDiagramLab(dir string) ([]PaletteItem, []DiagramCheck, error) {
	var meta struct {
		Palette []PaletteItem `yaml:"palette"`
	}
	if err := readYAML(filepath.Join(dir, "lab.yaml"), &meta); err != nil {
		return nil, nil, err
	}
	checks, err := LoadChecks(filepath.Join(dir, "tests", "checks.yaml"))
	return meta.Palette, checks, err
}

func readHints(file string) ([]string, error) {
	raw, err := os.ReadFile(file)
	if errors.Is(err, fs.ErrNotExist) {
		return []string{}, nil
	}
	if err != nil {
		return nil, err
	}
	hints := []string{}
	for _, h := range hintSplit.Split(string(raw), -1) {
		if h = strings.TrimSpace(h); h != "" {
			hints = append(hints, h)
		}
	}
	return hints, nil
}

func checkReferences(idx *Index) error {
	concepts := map[string]bool{}
	for _, l := range idx.Lessons {
		for _, c := range l.Concepts {
			concepts[c.ID] = true
		}
	}
	for _, l := range sortedValues(idx.Lessons) {
		for _, lab := range l.Labs {
			if idx.Exercises[lab] == nil {
				return fmt.Errorf("%s: TP %s introuvable", l.ID, lab)
			}
		}
		refs := slices.Clone(l.Visuals)
		for _, m := range visualDirective.FindAllStringSubmatch(l.Body, -1) {
			refs = append(refs, m[1])
		}
		for _, v := range refs {
			if idx.Visuals[v] == nil {
				return fmt.Errorf("%s: visuel %s introuvable", l.ID, v)
			}
		}
	}
	for _, quiz := range sortedValues(idx.Quizzes) {
		for _, q := range quiz.Questions {
			if !concepts[q.Concept] {
				return fmt.Errorf("%s/%s: concept %s inconnu", quiz.ID, q.ID, q.Concept)
			}
		}
	}
	for _, ex := range sortedValues(idx.Exercises) {
		for _, c := range ex.Concepts {
			if !concepts[c] {
				return fmt.Errorf("%s: concept %s inconnu", ex.ID, c)
			}
		}
	}
	return nil
}

func checkCourseRequirements(idx *Index) error {
	for _, id := range idx.CourseOrder {
		course := idx.Courses[id]
		for _, req := range course.Requires {
			other := idx.Courses[req.Course]
			if other == nil {
				return fmt.Errorf("%s: cours pré-requis %s inconnu", course.ID, req.Course)
			}
			if !slices.ContainsFunc(other.Tracks, func(t Track) bool { return slices.Contains(t.Chapters, req.Through) }) {
				return fmt.Errorf("%s: module %s absent de %s", course.ID, req.Through, req.Course)
			}
		}
	}
	return nil
}

// --- validation des champs (l'équivalent des modèles Pydantic) ------------

func required(file string, fields map[string]bool) error {
	var missing []string
	for name, ok := range fields {
		if !ok {
			missing = append(missing, name)
		}
	}
	if len(missing) > 0 {
		sort.Strings(missing)
		return fmt.Errorf("%s: champ(s) requis manquant(s) : %s", file, strings.Join(missing, ", "))
	}
	return nil
}

func oneOf(file, field, value string, allowed ...string) error {
	if !slices.Contains(allowed, value) {
		return fmt.Errorf("%s: %s = %q, attendu l'un de %v", file, field, value, allowed)
	}
	return nil
}

func (c *Course) validate(file string) error {
	if err := required(file, map[string]bool{
		"id": c.ID != "", "title": c.Title != "", "kind": c.Kind != "", "book": c.Book != nil,
		"summary": c.Summary != "", "tracks": c.Tracks != nil,
	}); err != nil {
		return err
	}
	if c.Order == nil {
		c.Order = new(100)
	}
	if c.PlannedTitles == nil {
		c.PlannedTitles = map[string]string{}
	}
	c.Book.Authors = nonNil(c.Book.Authors)
	for i := range c.Books {
		c.Books[i].Authors = nonNil(c.Books[i].Authors)
	}
	return oneOf(file, "kind", c.Kind, "practical", "conceptual")
}

func (ch *Chapter) validate(file string) error {
	return required(file, map[string]bool{
		"id": ch.ID != "", "title": ch.Title != "", "source": ch.Source != nil,
		"objectives": ch.Objectives != nil, "mastery_threshold": ch.MasteryThreshold != nil,
		"lessons": ch.Lessons != nil,
	})
}

func (l *Lesson) validate(file string) error {
	if err := required(file, map[string]bool{
		"id": l.ID != "", "title": l.Title != "", "source": l.Source != nil, "concepts": l.Concepts != nil,
	}); err != nil {
		return err
	}
	l.Glossary, l.Visuals, l.Labs = nonNil(l.Glossary), nonNil(l.Visuals), nonNil(l.Labs)
	return nil
}

func (v *Visual) validate(file string) error {
	if err := required(file, map[string]bool{
		"id": v.ID != "", "concept": v.Concept != "", "format": v.Format != "",
		"justification": v.Justification != "", "entry": v.Entry != "",
	}); err != nil {
		return err
	}
	v.Params = jsonMaps(v.Params)
	if err := oneOf(file, "format", v.Format, "remotion", "interactive", "static", "hyperframes"); err != nil {
		return err
	}
	return oneOf(file, "status", v.Status, "idea", "built")
}

func (q *Quiz) validate(file string) error {
	if err := required(file, map[string]bool{"id": q.ID != "", "questions": q.Questions != nil}); err != nil {
		return err
	}
	for i := range q.Questions {
		qq := &q.Questions[i]
		if err := required(fmt.Sprintf("%s/%s", file, qq.ID), map[string]bool{
			"id": qq.ID != "", "type": qq.Type != "", "prompt": qq.Prompt != "", "answer": qq.Answer != nil,
			"explanation": qq.Explanation != "", "concept": qq.Concept != "",
		}); err != nil {
			return err
		}
		if err := oneOf(file, "type", qq.Type, "single", "multiple", "code-output", "order", "free"); err != nil {
			return err
		}
		if qq.Difficulty == 0 {
			qq.Difficulty = 1
		}
		qq.Choices = nonNil(qq.Choices)
		answer, err := asJSON(qq.Answer)
		if err != nil {
			return fmt.Errorf("%s/%s: réponse illisible : %w", file, qq.ID, err)
		}
		qq.Answer = answer
	}
	return nil
}

func (ex *Exercise) validate(file string) error {
	if err := required(file, map[string]bool{
		"id": ex.ID != "", "title": ex.Title != "", "kind": ex.Kind != "", "files_editable": ex.FilesEditable != nil,
	}); err != nil {
		return err
	}
	if err := oneOf(file, "kind", ex.Kind, "code", "tests", "design", "diagram", "worksheet"); err != nil {
		return err
	}
	for _, c := range ex.Checks {
		if err := oneOf(file, "checks", c, "race", "goroutine-leak"); err != nil {
			return err
		}
	}
	if ex.Verified.Solution != "pass" || ex.Verified.Starter != "fail" || ex.Verified.At.IsZero() {
		return fmt.Errorf("%s: verified doit valoir { at: <date>, solution: pass, starter: fail }", file)
	}
	catalog, err := DiagramCatalog()
	if err != nil {
		return err
	}
	for i := range ex.Palette {
		p := &ex.Palette[i]
		if p.Type == "" || p.Label == "" {
			return fmt.Errorf("%s: palette : un bloc sans type ou label", file)
		}
		if p.Component == "" {
			p.Component = p.Shape // ancien format
		}
		if _, ok := catalog.Component(p.Component); !ok {
			return fmt.Errorf("%s: palette.%s : composant %q absent du catalogue (catalog.yaml)", file, p.Type, p.Component)
		}
		if p.Shape == "" {
			p.Shape = p.Component
		}
	}
	ex.Concepts, ex.Checks, ex.Palette = nonNil(ex.Concepts), nonNil(ex.Checks), nonNil(ex.Palette)
	return nil
}

// --- utilitaires -----------------------------------------------------------

func readYAML(file string, out any) error {
	raw, err := os.ReadFile(file)
	if err != nil {
		return err
	}
	return decodeYAML(file, raw, out)
}

func decodeYAML(file string, raw []byte, out any) error {
	if len(bytes.TrimSpace(raw)) == 0 {
		return nil
	}
	if err := yaml.Unmarshal(raw, out); err != nil {
		return fmt.Errorf("%s: YAML invalide : %w", file, err)
	}
	return nil
}

// jsonValue convertit une valeur YAML en valeur encodable en JSON, comme le ferait Python :
// clés de map non textuelles converties en texte, dates au format ISO.
func jsonValue(v any) any {
	switch t := v.(type) {
	case map[string]any:
		out := make(map[string]any, len(t))
		for k, val := range t {
			out[k] = jsonValue(val)
		}
		return out
	case map[any]any:
		out := make(map[string]any, len(t))
		for k, val := range t {
			out[jsonKey(k)] = jsonValue(val)
		}
		return out
	case []any:
		out := make([]any, len(t))
		for i, val := range t {
			out[i] = jsonValue(val)
		}
		return out
	case time.Time:
		if t.Equal(t.Truncate(24 * time.Hour)) {
			return t.Format(time.DateOnly)
		}
		return t.Format(time.RFC3339Nano)
	}
	return v
}

func jsonKey(k any) string {
	switch t := k.(type) {
	case bool:
		if t {
			return "true"
		}
		return "false"
	case nil:
		return "null"
	}
	return fmt.Sprint(k)
}

func jsonMaps(in []Map) []Map {
	out := make([]Map, len(in))
	for i, m := range in {
		out[i] = jsonValue(m).(map[string]any)
	}
	return out
}

// asJSON rend la valeur telle qu'un client JSON la renverrait (nombres en float64).
func asJSON(v any) (any, error) {
	raw, err := json.Marshal(jsonValue(v))
	if err != nil {
		return nil, err
	}
	var out any
	err = json.Unmarshal(raw, &out)
	return out, err
}

func nonNil[T any](s []T) []T {
	if s == nil {
		return []T{}
	}
	return s
}

func subdirs(dir string) []string {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil
	}
	var out []string
	for _, e := range entries {
		if e.IsDir() {
			out = append(out, filepath.Join(dir, e.Name()))
		}
	}
	return out // ReadDir trie déjà par nom
}

func sortedValues[T any](m map[string]*T) []*T {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	out := make([]*T, len(keys))
	for i, k := range keys {
		out[i] = m[k]
	}
	return out
}

func exists(p string) bool { _, err := os.Stat(p); return err == nil }

func isFile(p string) bool { st, err := os.Stat(p); return err == nil && st.Mode().IsRegular() }

func isDir(p string) bool { st, err := os.Stat(p); return err == nil && st.IsDir() }
