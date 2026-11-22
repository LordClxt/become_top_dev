package service

import (
	"context"
	"slices"
	"sort"
	"strings"

	"btd/backend/internal/content"
	"btd/backend/internal/model"
	"btd/backend/internal/repository"
)

// Lecture du contenu : catalogue, cours, chapitres, leçons, quiz. Jamais de solution ni de réponse de quiz.

type Ref struct {
	ID    string `json:"id"`
	Title string `json:"title"`
}

type Requirement struct {
	CourseID     string `json:"course_id"`
	CourseTitle  string `json:"course_title"`
	ThroughTitle string `json:"through_title"`
	Reason       string `json:"reason"`
	Met          bool   `json:"met"`
}

type ChapterItem struct {
	Slug        string          `json:"slug"`
	Available   bool            `json:"available"`
	ID          *string         `json:"id,omitempty"`
	Title       string          `json:"title"`
	Subtitle    *string         `json:"subtitle,omitempty"`
	LessonCount *int            `json:"lesson_count,omitempty"`
	Mastery     *ChapterMastery `json:"mastery,omitempty"`
}

type TrackView struct {
	ID       string        `json:"id"`
	Title    string        `json:"title"`
	Optional bool          `json:"optional"`
	Chapters []ChapterItem `json:"chapters"`
}

type CourseOverview struct {
	ID             string                  `json:"id"`
	Slug           string                  `json:"slug"`
	Title          string                  `json:"title"`
	Kind           string                  `json:"kind"`
	Summary        string                  `json:"summary"`
	Book           *content.Book           `json:"book"`
	Books          []content.Book          `json:"books"`
	RunningProject *content.RunningProject `json:"running_project"`
	Requires       []Requirement           `json:"requires"`
	Tracks         []TrackView             `json:"tracks"`
}

// orderedCourses renvoie les cours actifs (sans les cours en pause), dans l'ordre du catalogue.
func (s *Service) orderedCourses() []*content.Course {
	out := make([]*content.Course, 0, len(s.Content.CourseOrder))
	for _, id := range s.Content.CourseOrder {
		if c := s.Content.Courses[id]; !c.Paused {
			out = append(out, c)
		}
	}
	sort.SliceStable(out, func(i, j int) bool { return *out[i].Order < *out[j].Order })
	return out
}

func (s *Service) chaptersBySlug(courseID string) map[string]*content.Chapter {
	out := map[string]*content.Chapter{}
	for _, ch := range s.Content.Chapters {
		if ch.CourseID == courseID {
			out[ch.Slug] = ch
		}
	}
	return out
}

// Catalog est la vue publique (landing) : aucune donnée utilisateur.
func (s *Service) Catalog() []CourseOverview {
	out := []CourseOverview{}
	for _, c := range s.orderedCourses() {
		out = append(out, s.courseOverview(c, nil))
	}
	return out
}

// Courses est le catalogue avec la progression de l'utilisateur.
func (s *Service) Courses(ctx context.Context, uid int64) ([]CourseOverview, error) {
	mastery, err := s.ChapterMastery(ctx, uid)
	if err != nil {
		return nil, err
	}
	out := []CourseOverview{}
	for _, c := range s.orderedCourses() {
		out = append(out, s.courseOverview(c, mastery))
	}
	return out, nil
}

func (s *Service) courseOverview(course *content.Course, mastery map[string]*ChapterMastery) CourseOverview {
	bySlug := s.chaptersBySlug(course.ID)
	tracks := []TrackView{}
	for _, track := range course.Tracks {
		items := []ChapterItem{}
		for _, slug := range track.Chapters {
			ch := bySlug[slug]
			if ch == nil {
				title := slug
				if t, ok := course.PlannedTitles[slug]; ok {
					title = t
				}
				items = append(items, ChapterItem{Slug: slug, Title: title})
				continue
			}
			item := ChapterItem{
				Slug: slug, Available: true, ID: &ch.ID, Title: ch.Title, Subtitle: &ch.Subtitle,
				LessonCount: new(len(ch.LessonIDs)),
			}
			if mastery != nil {
				item.Mastery = mastery[ch.ID]
			}
			items = append(items, item)
		}
		tracks = append(tracks, TrackView{ID: track.ID, Title: track.Title, Optional: track.Optional, Chapters: items})
	}
	requires := []Requirement{}
	for _, req := range course.Requires {
		requires = append(requires, s.requirement(req, mastery))
	}
	return CourseOverview{
		ID: course.ID, Slug: course.Slug, Title: course.Title, Kind: course.Kind, Summary: course.Summary,
		Book: course.Book, Books: nonNilBooks(course.Books), RunningProject: course.RunningProject, Requires: requires, Tracks: tracks,
	}
}

// requirement : pré-requis rempli quand chaque module jusqu'à Through existe et est maîtrisé.
func (s *Service) requirement(req content.CourseRequirement, mastery map[string]*ChapterMastery) Requirement {
	other := s.Content.Courses[req.Course]
	var slugs []string
	for _, t := range other.Tracks {
		slugs = append(slugs, t.Chapters...)
	}
	needed := slugs[:slices.Index(slugs, req.Through)+1]
	bySlug := s.chaptersBySlug(other.ID)
	met := mastery != nil
	for _, slug := range needed {
		if ch := bySlug[slug]; met && (ch == nil || !mastery[ch.ID].Mastered) {
			met = false
		}
	}
	through := req.Through
	if t, ok := other.PlannedTitles[req.Through]; ok {
		through = t
	}
	return Requirement{CourseID: other.ID, CourseTitle: other.Title, ThroughTitle: through, Reason: req.Reason, Met: met}
}

type ExerciseSummary struct {
	ID         string `json:"id"`
	Title      string `json:"title"`
	Role       string `json:"role"`
	Difficulty int    `json:"difficulty"`
	XP         int    `json:"xp"`
	Passed     bool   `json:"passed"`
}

func (s *Service) exerciseSummary(id string, passed map[string]bool) *ExerciseSummary {
	if id == "" {
		return nil
	}
	ex := s.Content.Exercises[id]
	return &ExerciseSummary{ID: ex.ID, Title: ex.Title, Role: ex.Role, Difficulty: ex.Difficulty, XP: ex.XP, Passed: passed[ex.ID]}
}

func (s *Service) labSummaries(labs []string, passed map[string]bool) []*ExerciseSummary {
	out := []*ExerciseSummary{}
	for _, lab := range labs {
		out = append(out, s.exerciseSummary(lab, passed))
	}
	return out
}

func (s *Service) passedExercises(ctx context.Context, uid int64) (map[string]bool, error) {
	all, err := s.repos().Progress(uid).AllExerciseProgress(ctx)
	passed := map[string]bool{}
	for id, p := range all {
		if p.PassedAt != nil {
			passed[id] = true
		}
	}
	return passed, err
}

type LessonItem struct {
	ID          string             `json:"id"`
	Title       string             `json:"title"`
	DurationMin int                `json:"duration_min"`
	XP          int                `json:"xp"`
	Completed   bool               `json:"completed"`
	Labs        []*ExerciseSummary `json:"labs"`
}

type ChapterView struct {
	ID               string           `json:"id"`
	Course           Ref              `json:"course"`
	Title            string           `json:"title"`
	Subtitle         string           `json:"subtitle"`
	Source           *content.Source  `json:"source"`
	Objectives       []string         `json:"objectives"`
	MasteryThreshold float64          `json:"mastery_threshold"`
	Lessons          []LessonItem     `json:"lessons"`
	Assignment       *ExerciseSummary `json:"assignment"`
	Boss             *ExerciseSummary `json:"boss"`
	Project          *ExerciseSummary `json:"project"`
	Mastery          *ChapterMastery  `json:"mastery"`
}

func (s *Service) Chapter(ctx context.Context, uid int64, id string) (*ChapterView, error) {
	ch := s.Content.Chapters[id]
	if ch == nil {
		return nil, errorf(NotFound, "chapitre introuvable")
	}
	passed, err := s.passedExercises(ctx, uid)
	if err != nil {
		return nil, err
	}
	done, err := s.repos().Progress(uid).CompletedLessons(ctx)
	if err != nil {
		return nil, err
	}
	mastery, err := s.ChapterMastery(ctx, uid)
	if err != nil {
		return nil, err
	}
	lessons := []LessonItem{}
	for _, lid := range ch.LessonIDs {
		l := s.Content.Lessons[lid]
		lessons = append(lessons, LessonItem{
			ID: l.ID, Title: l.Title, DurationMin: l.DurationMin, XP: l.XP, Completed: done[l.ID],
			Labs: s.labSummaries(l.Labs, passed),
		})
	}
	course := s.Content.Courses[ch.CourseID]
	return &ChapterView{
		ID: ch.ID, Course: Ref{course.ID, course.Title}, Title: ch.Title, Subtitle: ch.Subtitle, Source: ch.Source,
		Objectives: ch.Objectives, MasteryThreshold: *ch.MasteryThreshold, Lessons: lessons,
		Assignment: s.exerciseSummary(ch.AssignmentID, passed), Boss: s.exerciseSummary(ch.BossID, passed),
		Project: s.exerciseSummary(ch.ProjectID, passed), Mastery: mastery[ch.ID],
	}, nil
}

type LessonChapter struct {
	ID       string `json:"id"`
	Title    string `json:"title"`
	CourseID string `json:"course_id"`
}

type LessonView struct {
	ID          string                     `json:"id"`
	Title       string                     `json:"title"`
	Chapter     LessonChapter              `json:"chapter"`
	Source      *content.Source            `json:"source"`
	DurationMin int                        `json:"duration_min"`
	XP          int                        `json:"xp"`
	Extra       bool                       `json:"extra"`
	Body        string                     `json:"body"`
	Concepts    []content.Concept          `json:"concepts"`
	Glossary    []content.GlossaryEntry    `json:"glossary"`
	Visuals     map[string]*content.Visual `json:"visuals"`
	Labs        []*ExerciseSummary         `json:"labs"`
	QuizID      *string                    `json:"quiz_id"`
	Flashcards  []content.Flashcard        `json:"flashcards"`
	Checkpoints []CheckpointView           `json:"checkpoints"`
	CardsRated  int                        `json:"cards_rated"` // cartes de la leçon déjà notées au moins une fois
	Reading     *ReadingView               `json:"reading"`     // dernière position de lecture (null si jamais ouverte)
	Completed   bool                       `json:"completed"`
	PreviousID  *string                    `json:"previous_id"`
	NextID      *string                    `json:"next_id"`
}

func (s *Service) Lesson(ctx context.Context, uid int64, id string) (*LessonView, error) {
	l := s.Content.Lessons[id]
	if l == nil {
		return nil, errorf(NotFound, "leçon introuvable")
	}
	ch := s.Content.Chapters[l.ChapterID]
	pos := slices.Index(ch.LessonIDs, l.ID)
	passed, err := s.passedExercises(ctx, uid)
	if err != nil {
		return nil, err
	}
	done, err := s.repos().Progress(uid).CompletedLessons(ctx)
	if err != nil {
		return nil, err
	}
	visuals := map[string]*content.Visual{}
	for _, vid := range l.Visuals {
		visuals[vid] = s.Content.Visuals[vid]
	}
	view := &LessonView{
		ID: l.ID, Title: l.Title, Chapter: LessonChapter{ch.ID, ch.Title, ch.CourseID}, Source: l.Source,
		DurationMin: l.DurationMin, XP: l.XP, Extra: l.Extra, Body: l.Body, Concepts: l.Concepts,
		Glossary: l.Glossary, Visuals: visuals, Labs: s.labSummaries(l.Labs, passed), QuizID: optional(l.QuizID),
		Flashcards: l.Flashcards, Completed: done[l.ID],
	}
	view.Checkpoints, err = s.checkpointViews(ctx, uid, l)
	if err != nil {
		return nil, err
	}
	view.Reading, err = s.readingOf(ctx, uid, l.ID)
	if err != nil {
		return nil, err
	}
	reviews, err := s.repos().Progress(uid).CardReviews(ctx, "UTC")
	if err != nil {
		return nil, err
	}
	for _, r := range reviews {
		if strings.HasPrefix(r.CardID, l.ID+"/") {
			view.CardsRated++
		}
	}
	if pos > 0 {
		view.PreviousID = &ch.LessonIDs[pos-1]
	}
	if pos+1 < len(ch.LessonIDs) {
		view.NextID = &ch.LessonIDs[pos+1]
	}
	return view, nil
}

type XPAwarded struct {
	XPAwarded int `json:"xp_awarded"`
}

func (s *Service) CompleteLesson(ctx context.Context, uid int64, id string) (*XPAwarded, error) {
	l := s.Content.Lessons[id]
	if l == nil {
		return nil, errorf(NotFound, "leçon introuvable")
	}
	var xp int
	err := s.store.InTx(ctx, func(r repository.Repos) error {
		if err := r.Progress(uid).CompleteLesson(ctx, l.ID); err != nil {
			return err
		}
		var err error
		xp, err = r.Progress(uid).AwardXP(ctx, "lesson", l.ID, l.XP)
		return err
	})
	return &XPAwarded{xp}, err
}

type QuestionView struct {
	ID         string   `json:"id"`
	Type       string   `json:"type"`
	Prompt     string   `json:"prompt"`
	Code       *string  `json:"code"`
	Choices    []string `json:"choices"`
	Difficulty int      `json:"difficulty"`
	Answered   bool     `json:"answered"`
}

type QuizView struct {
	ID        string         `json:"id"`
	LessonID  string         `json:"lesson_id"`
	Language  string         `json:"language"` // langage des extraits de code (coloration)
	Questions []QuestionView `json:"questions"`
}

func (s *Service) Quiz(ctx context.Context, uid int64, id string) (*QuizView, error) {
	quiz := s.Content.Quizzes[id]
	if quiz == nil {
		return nil, errorf(NotFound, "quiz introuvable")
	}
	first, err := s.repos().Progress(uid).FirstAttempts(ctx)
	if err != nil {
		return nil, err
	}
	view := &QuizView{ID: quiz.ID, LessonID: quiz.LessonID, Language: s.lessonLanguage(quiz.LessonID), Questions: []QuestionView{}}
	for _, q := range quiz.Questions {
		_, answered := first[model.QuestionKey{QuizID: quiz.ID, QuestionID: q.ID}]
		view.Questions = append(view.Questions, QuestionView{
			ID: q.ID, Type: q.Type, Prompt: q.Prompt, Code: q.Code, Choices: q.Choices, Difficulty: q.Difficulty,
			Answered: answered,
		})
	}
	return view, nil
}

// lessonLanguage renvoie le langage du cours d'une leçon (vide si inconnu).
func (s *Service) lessonLanguage(lessonID string) string {
	lesson := s.Content.Lessons[lessonID]
	if lesson == nil {
		return ""
	}
	chapter := s.Content.Chapters[lesson.ChapterID]
	if chapter == nil {
		return ""
	}
	if course := s.Content.Courses[chapter.CourseID]; course != nil {
		return course.Language
	}
	return ""
}

type AnswerResult struct {
	Correct     bool   `json:"correct"`
	Expected    any    `json:"expected"`
	Explanation string `json:"explanation"`
	XPAwarded   int    `json:"xp_awarded"` // bonus compris
	Bonus       *Bonus `json:"bonus"`      // « Sans faute » quand cette réponse termine un quiz parfait
}

// Answer corrige une réponse. Seule la première tentative par question rapporte de l'XP.
func (s *Service) Answer(ctx context.Context, uid int64, quizID, questionID string, answer any) (*AnswerResult, error) {
	quiz := s.Content.Quizzes[quizID]
	if quiz == nil {
		return nil, errorf(NotFound, "quiz introuvable")
	}
	i := slices.IndexFunc(quiz.Questions, func(q content.QuizQuestion) bool { return q.ID == questionID })
	if i < 0 {
		return nil, errorf(NotFound, "question introuvable")
	}
	q := quiz.Questions[i]
	correct, err := IsCorrect(q, answer)
	if err != nil {
		return nil, errorf(Invalid, "type de question non corrigé automatiquement : %s", err)
	}
	xp := 0
	var bonus *Bonus
	err = s.store.InTx(ctx, func(r repository.Repos) error {
		p := r.Progress(uid)
		answered, err := p.HasAnswered(ctx, quiz.ID, q.ID)
		if err != nil {
			return err
		}
		err = p.AddAnswer(ctx, model.QuizAnswer{
			QuizID: quiz.ID, QuestionID: q.ID, Answer: answer, Correct: correct, FirstAttempt: !answered,
		})
		if err != nil || !correct || answered {
			return err
		}
		if xp, err = p.AwardXP(ctx, "quiz", quiz.ID+"/"+q.ID, QuizXPPerQuestion); err != nil {
			return err
		}
		// Sans faute : cette réponse est la dernière première tentative du quiz, et toutes étaient justes.
		first, err := p.FirstAttempts(ctx)
		if err != nil {
			return err
		}
		for _, other := range quiz.Questions {
			if !first[model.QuestionKey{QuizID: quiz.ID, QuestionID: other.ID}] {
				return nil
			}
		}
		got, err := p.AwardXP(ctx, "bonus", "quiz_perfect/"+quiz.ID, QuizPerfectXP)
		if got > 0 {
			xp += got
			bonus = &Bonus{"quiz_perfect", "Sans faute", got}
		}
		return err
	})
	if err != nil {
		return nil, err
	}
	return &AnswerResult{Correct: correct, Expected: q.Answer, Explanation: q.Explanation, XPAwarded: xp, Bonus: bonus}, nil
}

// CheckpointXP est l'XP d'un point de contrôle réussi (une seule fois).
const CheckpointXP = 3

// CheckpointView est une question posée dans le corps d'une leçon, sans réponse ni explication.
type CheckpointView struct {
	ID       string   `json:"id"`
	Type     string   `json:"type"`
	Prompt   string   `json:"prompt"`
	Code     *string  `json:"code"`
	Choices  []string `json:"choices"`
	Answered bool     `json:"answered"` // déjà réussi une fois
}

func checkpointRef(lessonID, checkpointID string) string { return lessonID + "/" + checkpointID }

func (s *Service) checkpointViews(ctx context.Context, uid int64, l *content.Lesson) ([]CheckpointView, error) {
	out := []CheckpointView{}
	if len(l.Checkpoints) == 0 {
		return out, nil
	}
	solved, err := s.repos().Progress(uid).XPRefs(ctx, "checkpoint", l.ID+"/")
	if err != nil {
		return nil, err
	}
	for _, c := range l.Checkpoints {
		out = append(out, CheckpointView{
			ID: c.ID, Type: c.Type, Prompt: c.Prompt, Code: c.Code, Choices: c.Choices,
			Answered: solved[checkpointRef(l.ID, c.ID)],
		})
	}
	return out, nil
}

// AnswerCheckpoint corrige un point de contrôle. Les essais sont libres ; la première bonne réponse rapporte
// CheckpointXP. Rien n'est écrit dans quiz_answers : la maîtrise du module n'en dépend pas.
func (s *Service) AnswerCheckpoint(ctx context.Context, uid int64, lessonID, checkpointID string, answer any) (*AnswerResult, error) {
	l := s.Content.Lessons[lessonID]
	if l == nil {
		return nil, errorf(NotFound, "leçon introuvable")
	}
	i := slices.IndexFunc(l.Checkpoints, func(q content.QuizQuestion) bool { return q.ID == checkpointID })
	if i < 0 {
		return nil, errorf(NotFound, "point de contrôle introuvable")
	}
	c := l.Checkpoints[i]
	correct, err := IsCorrect(c, answer)
	if err != nil {
		return nil, errorf(Invalid, "type de question non corrigé automatiquement : %s", err)
	}
	xp := 0
	if correct {
		xp, err = s.repos().Progress(uid).AwardXP(ctx, "checkpoint", checkpointRef(l.ID, c.ID), CheckpointXP)
		if err != nil {
			return nil, err
		}
	}
	return &AnswerResult{Correct: correct, Expected: c.Answer, Explanation: c.Explanation, XPAwarded: xp}, nil
}

func optional(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

func nonNilBooks(b []content.Book) []content.Book {
	if b == nil {
		return []content.Book{}
	}
	return b
}
