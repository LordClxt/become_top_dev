// Package content charge et valide les cours de content/ (voir le skill content-format).
// Le contenu n'est jamais en base : il est lu au démarrage et reste en mémoire, en lecture seule.
package content

import "time"

type Source struct {
	Chapter int    `yaml:"chapter" json:"chapter"`
	Pages   string `yaml:"pages" json:"pages"`
	Book    string `yaml:"book,omitempty" json:"book,omitempty"` // slug du livre si le cours en cite plusieurs
	URL     string `yaml:"url,omitempty" json:"url,omitempty"`   // page de documentation citée (cours construit sur une doc)
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

// PaletteItem est un bloc que l'on peut poser sur un diagramme. Component désigne un composant du catalogue
// (catalog.yaml) qui fixe l'icône, la couleur et les propriétés ; l'ancien Shape (client, service, queue, database,
// external, cache) reste accepté et sert de Component quand celui-ci est absent.
type PaletteItem struct {
	Type      string `yaml:"type" json:"type"`
	Label     string `yaml:"label" json:"label"`
	Shape     string `yaml:"shape" json:"shape"`
	Component string `yaml:"component" json:"component"`
	Hint      string `yaml:"hint" json:"hint"`
}

// DiagramCheck est une règle vérifiée sur le graphe d'un exercice diagram (voir service/diagram.go).
//
//   - path : un chemin de Source à Target existe (et passe toujours par Via, si précisé)
//   - no_edge : aucune flèche directe de Source vers Target
//   - inbound_via : tout ce qui entre dans Target vient d'un bloc de type Via
//   - single_owner : chaque bloc de type Target a au plus un bloc entrant
//   - connected : aucun bloc isolé
//   - prop : chaque bloc de type Source a la propriété Prop égale à Value (et il y en a au moins un)
//   - edge_kind : chaque flèche de Source vers Target est de nature Kind (et il y en a au moins une)
//   - count : le nombre de blocs de type Source est compris entre Min et Max (Max absent : sans plafond)
//   - in_zone : chaque bloc de type Source est posé dans une zone de type Target
//   - link : un bloc nommé Source est relié à un bloc nommé Target par une flèche d'étiquette Value (noms et étiquette sans casse)
//   - tree_shape : les blocs de type Source forment l'arbre Tree (clés lues dans la propriété "keys", enfants de gauche à droite)
type DiagramCheck struct {
	ID     string    `yaml:"id"`
	Label  string    `yaml:"label"`
	Rule   string    `yaml:"rule"`
	Source string    `yaml:"source"`
	Target string    `yaml:"target"`
	Via    string    `yaml:"via"`
	Prop   string    `yaml:"prop"`
	Value  string    `yaml:"value"`
	Kind   string    `yaml:"kind"`
	Min    *int      `yaml:"min"`
	Max    *int      `yaml:"max"`
	Tree   *TreeSpec `yaml:"tree"`
}

// TreeSpec décrit un arbre attendu : les clés d'une page et ses enfants, dans l'ordre.
type TreeSpec struct {
	Keys     string     `yaml:"keys"`
	Children []TreeSpec `yaml:"children"`
}

type Map = map[string]any

// --- Fiches interactives (kind: worksheet) ---------------------------------------------------------------------

// WSOption est un choix, un élément à ordonner ou à ranger, ou une catégorie.
type WSOption struct {
	ID    string `yaml:"id" json:"id"`
	Label string `yaml:"label" json:"label"`
	Hint  string `yaml:"hint" json:"hint"`
}

// WSColumn est une colonne d'un bloc table.
type WSColumn struct {
	ID    string `yaml:"id" json:"id"`
	Label string `yaml:"label" json:"label"`
}

// WSRow est une ligne d'un bloc table : Cells donne les cases déjà remplies, les autres sont à compléter.
type WSRow struct {
	ID    string            `yaml:"id" json:"id"`
	Label string            `yaml:"label" json:"label"`
	Cells map[string]string `yaml:"cells" json:"cells"`
}

// WSParam est un curseur d'un bloc tuner.
type WSParam struct {
	ID      string  `yaml:"id" json:"id"`
	Label   string  `yaml:"label" json:"label"`
	Unit    string  `yaml:"unit" json:"unit"`
	Min     float64 `yaml:"min" json:"min"`
	Max     float64 `yaml:"max" json:"max"`
	Step    float64 `yaml:"step" json:"step"`
	Default float64 `yaml:"default" json:"default"`
}

// WSMetric est une valeur calculée en direct à partir des curseurs (et des métriques précédentes).
type WSMetric struct {
	ID     string `yaml:"id" json:"id"`
	Label  string `yaml:"label" json:"label"`
	Expr   string `yaml:"expr" json:"expr"`
	Unit   string `yaml:"unit" json:"unit"`
	Format string `yaml:"format" json:"format"` // number | percent | bytes | duration-s
}

// WSGoal est une contrainte à satisfaire : une expression booléenne sur les curseurs et les métriques.
type WSGoal struct {
	ID    string `yaml:"id" json:"id"`
	Label string `yaml:"label" json:"label"`
	Expr  string `yaml:"expr" json:"expr"`
}

// WSBlock est une brique d'une fiche. Type : number | choice | multi | order | match | table | tuner.
type WSBlock struct {
	ID         string     `yaml:"id" json:"id"`
	Type       string     `yaml:"type" json:"type"`
	Title      string     `yaml:"title" json:"title"`
	Prompt     string     `yaml:"prompt" json:"prompt"`
	Unit       string     `yaml:"unit" json:"unit"`
	Options    []WSOption `yaml:"options" json:"options"`       // choice, multi
	Items      []WSOption `yaml:"items" json:"items"`           // order, match
	Categories []WSOption `yaml:"categories" json:"categories"` // match
	Columns    []WSColumn `yaml:"columns" json:"columns"`       // table
	Rows       []WSRow    `yaml:"rows" json:"rows"`             // table
	Params     []WSParam  `yaml:"params" json:"params"`         // tuner
	Metrics    []WSMetric `yaml:"metrics" json:"metrics"`       // tuner
	Goals      []WSGoal   `yaml:"goals" json:"goals"`           // tuner
}

// Worksheet est le spécifique public d'une fiche (worksheet.yaml) : ce que le client affiche.
type Worksheet struct {
	Intro  string    `yaml:"intro" json:"intro"`
	Blocks []WSBlock `yaml:"blocks" json:"blocks"`
}

// WSTolerance règle la comparaison d'une valeur numérique.
type WSTolerance struct {
	Rel float64 `yaml:"rel"`
	Abs float64 `yaml:"abs"`
}

// WSBlockFeedback est la partie privée d'un bloc : tolérances et explications des mauvaises réponses.
type WSBlockFeedback struct {
	Tolerance *WSTolerance      `yaml:"tolerance"`
	Wrong     string            `yaml:"wrong"`   // message général en cas d'erreur
	Options   map[string]string `yaml:"options"` // explication par option (ou par élément/cellule) fausse
	Goals     map[string]string `yaml:"goals"`   // explication par contrainte non satisfaite (tuner)
}

// WorksheetFeedback est tests/feedback.yaml.
type WorksheetFeedback struct {
	Blocks map[string]WSBlockFeedback `yaml:"blocks"`
}

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

	Worksheet         *Worksheet         `yaml:"-"`
	WorksheetFeedback *WorksheetFeedback `yaml:"-"`
	WorksheetAnswers  map[string]any     `yaml:"-"` // solution/answers.json, jamais envoyé au client
	Debrief           string             `yaml:"-"` // debrief.md, dévoilé après réussite

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
	Kind           string              `yaml:"kind"`     // practical | conceptual
	Language       string              `yaml:"language"` // langage des TP et des extraits de code
	Book           *Book               `yaml:"book"`
	Books          []Book              `yaml:"books"` // livres complémentaires (cours construit sur plusieurs livres)
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
