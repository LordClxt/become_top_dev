// Package content charge et valide les cours de content/ (voir le skill content-format).
// Le contenu n'est jamais en base : il est lu au démarrage et reste en mémoire, en lecture seule.
package content

import "time"

type Source struct {
	Chapter int    `yaml:"chapter" json:"chapter"`
	Pages   string `yaml:"pages" json:"pages"`
}

type Concept struct {
	ID    string `yaml:"id" json:"id"`
	Label string `yaml:"label" json:"label"`
}

type GlossaryEntry struct {
	Term       string `yaml:"term" json:"term"`
	Definition string `yaml:"definition" json:"definition"`
}

type Verified struct {
	At       time.Time `yaml:"at"`
	Solution string    `yaml:"solution"`
	Starter  string    `yaml:"starter"`
}

// PaletteItem est un bloc que l'on peut poser sur un diagramme. Shape choisit l'icône et la forme.
type PaletteItem struct {
	Type  string `yaml:"type" json:"type"`
	Label string `yaml:"label" json:"label"`
	Shape string `yaml:"shape" json:"shape"`
	Hint  string `yaml:"hint" json:"hint"`
}

// DiagramCheck est une règle vérifiée sur le graphe d'un exercice diagram (voir service/diagram.go).
//
//   - path : un chemin de Source à Target existe (et passe toujours par Via, si précisé)
//   - no_edge : aucune flèche directe de Source vers Target
//   - inbound_via : tout ce qui entre dans Target vient d'un bloc de type Via
//   - single_owner : chaque bloc de type Target a au plus un bloc entrant
//   - connected : aucun bloc isolé
type DiagramCheck struct {
	ID     string `yaml:"id"`
	Label  string `yaml:"label"`
	Rule   string `yaml:"rule"`
	Source string `yaml:"source"`
	Target string `yaml:"target"`
	Via    string `yaml:"via"`
}

type Map = map[string]any

// Exercise est un exercice exécutable : TP, devoir, boss fight ou étape de projet.
type Exercise struct {
	ID            string        `yaml:"id"`
	Title         string        `yaml:"title"`
	Kind          string        `yaml:"kind"`
	Language      string        `yaml:"language"`
	XP            int           `yaml:"xp"`
	TestCommand   string        `yaml:"test_command"`
	FilesEditable []string      `yaml:"files_editable"`
	Concepts      []string      `yaml:"concepts"`
	Difficulty    int           `yaml:"difficulty"`
	TimeoutS      int           `yaml:"timeout_s"`
	Checks        []string      `yaml:"checks"`
	Verified      *Verified     `yaml:"verified"`
	Source        *Source       `yaml:"source"`
	Palette       []PaletteItem `yaml:"palette"`

	Role          string         `yaml:"-"` // lab | assignment | boss | project
	ChapterID     string         `yaml:"-"`
	LessonID      string         `yaml:"-"` // vide hors leçon
	CourseID      string         `yaml:"-"` // exercices de l'atelier uniquement
	Path          string         `yaml:"-"`
	Instructions  string         `yaml:"-"`
	Hints         []string       `yaml:"-"`
	Rubric        []Map          `yaml:"-"`
	Milestones    []Map          `yaml:"-"`
	DiagramChecks []DiagramCheck `yaml:"-"`
}

type QuizQuestion struct {
	ID          string   `yaml:"id"`
	Type        string   `yaml:"type"` // single | multiple | code-output | order | free
	Prompt      string   `yaml:"prompt"`
	Code        *string  `yaml:"code"`
	Choices     []string `yaml:"choices"`
	Answer      any      `yaml:"answer"` // normalisée comme du JSON (nombres en float64)
	Explanation string   `yaml:"explanation"`
	Concept     string   `yaml:"concept"`
	Difficulty  int      `yaml:"difficulty"`
}

type Quiz struct {
	ID        string         `yaml:"id"`
	Questions []QuizQuestion `yaml:"questions"`
	LessonID  string         `yaml:"-"`
}

type Flashcard struct {
	ID      string `yaml:"id" json:"id"`
	Front   string `yaml:"front" json:"front"`
	Back    string `yaml:"back" json:"back"`
	Concept string `yaml:"concept" json:"concept"`
}

type Visual struct {
	ID            string `yaml:"id" json:"id"`
	Concept       string `yaml:"concept" json:"concept"`
	Format        string `yaml:"format" json:"format"`
	Justification string `yaml:"justification" json:"justification"`
	Entry         string `yaml:"entry" json:"entry"`
	Status        string `yaml:"status" json:"status"`
	Params        []Map  `yaml:"params" json:"params"`
}

type Lesson struct {
	ID          string          `yaml:"id"`
	Title       string          `yaml:"title"`
	Source      *Source         `yaml:"source"`
	DurationMin int             `yaml:"duration_min"`
	Concepts    []Concept       `yaml:"concepts"`
	Glossary    []GlossaryEntry `yaml:"glossary"`
	Visuals     []string        `yaml:"visuals"`
	Labs        []string        `yaml:"labs"`
	Extra       bool            `yaml:"extra"`
	XP          int             `yaml:"xp"`

	Body       string      `yaml:"-"`
	Slug       string      `yaml:"-"`
	ChapterID  string      `yaml:"-"`
	QuizID     string      `yaml:"-"` // vide sans quiz
	Flashcards []Flashcard `yaml:"-"`
}

type Chapter struct {
	ID               string   `yaml:"id"`
	Title            string   `yaml:"title"`
	Subtitle         string   `yaml:"subtitle"`
	Source           *Source  `yaml:"source"`
	Objectives       []string `yaml:"objectives"`
	MasteryThreshold *float64 `yaml:"mastery_threshold"`
	Lessons          []string `yaml:"lessons"`

	Slug         string   `yaml:"-"`
	CourseID     string   `yaml:"-"`
	LessonIDs    []string `yaml:"-"`
	AssignmentID string   `yaml:"-"`
	BossID       string   `yaml:"-"`
	ProjectID    string   `yaml:"-"`
}

type Track struct {
	ID       string   `yaml:"id"`
	Title    string   `yaml:"title"`
	Chapters []string `yaml:"chapters"`
	Optional bool     `yaml:"optional"`
}

type Book struct {
	Title   string   `yaml:"title" json:"title"`
	Authors []string `yaml:"authors" json:"authors"`
	Slug    string   `yaml:"slug" json:"slug"`
}

type RunningProject struct {
	ID    string `yaml:"id" json:"id"`
	Title string `yaml:"title" json:"title"`
	Pitch string `yaml:"pitch" json:"pitch"`
}

// CourseRequirement est un cours conseillé avant celui-ci, jusqu'au module Through inclus (pré-requis souple).
type CourseRequirement struct {
	Course  string `yaml:"course"`
	Through string `yaml:"through"`
	Reason  string `yaml:"reason"`
}

type Course struct {
	ID             string              `yaml:"id"`
	Title          string              `yaml:"title"`
	Kind           string              `yaml:"kind"` // practical | conceptual
	Book           *Book               `yaml:"book"`
	Summary        string              `yaml:"summary"`
	Order          *int                `yaml:"order"` // position dans le catalogue (100 par défaut)
	RunningProject *RunningProject     `yaml:"running_project"`
	Requires       []CourseRequirement `yaml:"requires"`
	Tracks         []Track             `yaml:"tracks"`
	PlannedTitles  map[string]string   `yaml:"planned_titles"`

	Slug       string   `yaml:"-"`
	ChapterIDs []string `yaml:"-"`
}

// Index rassemble tout le contenu chargé, par id.
type Index struct {
	Courses   map[string]*Course
	Chapters  map[string]*Chapter
	Lessons   map[string]*Lesson
	Exercises map[string]*Exercise
	Quizzes   map[string]*Quiz
	Visuals   map[string]*Visual
	// Exercices de l'atelier (content/<livre>/sandbox/) : hors module, pour s'entraîner.
	Sandbox []string
	// Ordre de chargement des cours (dossiers triés).
	CourseOrder []string
}
