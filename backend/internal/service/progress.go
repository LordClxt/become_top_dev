package service

import (
	"context"
	"math"
	"slices"
	"strings"
	"time"

	"btd/backend/internal/content"
	"btd/backend/internal/model"
)

type ChapterMastery struct {
	ChapterID    string  `json:"chapter_id"`
	LabsPassed   int     `json:"labs_passed"`
	LabsTotal    int     `json:"labs_total"`
	QuizCorrect  int     `json:"quiz_correct"`
	QuizTotal    int     `json:"quiz_total"`
	LessonsDone  int     `json:"lessons_done"`
	LessonsTotal int     `json:"lessons_total"`
	Score        float64 `json:"score"`
	Mastered     bool    `json:"mastered"`
	Unlocked     bool    `json:"unlocked"`
}

// ChapterMastery calcule la maîtrise de chaque chapitre. Un chapitre est débloqué quand le précédent est maîtrisé.
func (s *Service) ChapterMastery(ctx context.Context, uid int64) (map[string]*ChapterMastery, error) {
	r := s.repos().Progress(uid)
	exercises, err := r.AllExerciseProgress(ctx)
	if err != nil {
		return nil, err
	}
	first, err := r.FirstAttempts(ctx)
	if err != nil {
		return nil, err
	}
	done, err := r.CompletedLessons(ctx)
	if err != nil {
		return nil, err
	}
	out := map[string]*ChapterMastery{}
	for _, course := range s.Content.Courses {
		previousMastered := true
		for _, id := range course.ChapterIDs {
			m := s.mastery(s.Content.Chapters[id], exercises, first, done)
			m.Unlocked = previousMastered || s.unlockAll
			previousMastered = m.Mastered
			out[id] = m
		}
	}
	return out, nil
}

func (s *Service) mastery(ch *content.Chapter, exercises map[string]model.ExerciseProgress,
	first map[model.QuestionKey]bool, done map[string]bool) *ChapterMastery {
	m := &ChapterMastery{ChapterID: ch.ID, LessonsTotal: len(ch.LessonIDs)}
	for _, lid := range ch.LessonIDs {
		lesson := s.Content.Lessons[lid]
		if done[lid] {
			m.LessonsDone++
		}
		for _, lab := range lesson.Labs {
			m.LabsTotal++
			if p, ok := exercises[lab]; ok && p.PassedAt != nil {
				m.LabsPassed++
			}
		}
		if quiz := s.Content.Quizzes[lesson.QuizID]; quiz != nil {
			for _, q := range quiz.Questions {
				m.QuizTotal++
				if first[model.QuestionKey{QuizID: quiz.ID, QuestionID: q.ID}] {
					m.QuizCorrect++
				}
			}
		}
	}
	labRatio, quizRatio := 1.0, 1.0
	if m.LabsTotal > 0 {
		labRatio = float64(m.LabsPassed) / float64(m.LabsTotal)
	}
	if m.QuizTotal > 0 {
		quizRatio = float64(m.QuizCorrect) / float64(m.QuizTotal)
	}
	m.Score = math.RoundToEven((labRatio+quizRatio)/2*1000) / 1000
	m.Mastered = m.Score >= *ch.MasteryThreshold
	return m
}

type ProgressSummary struct {
	XP                int                        `json:"xp"`
	Level             int                        `json:"level"`
	LevelFloorXP      int                        `json:"level_floor_xp"`
	NextLevelXP       int                        `json:"next_level_xp"`
	StreakDays        int                        `json:"streak_days"`
	LongestStreakDays int                        `json:"longest_streak_days"`
	ActiveDays        int                        `json:"active_days"`
	Chapters          map[string]*ChapterMastery `json:"chapters"`
}

func (s *Service) Summary(ctx context.Context, uid int64, today time.Time, tz string) (*ProgressSummary, error) {
	r := s.repos().Progress(uid)
	xp, err := r.TotalXP(ctx)
	if err != nil {
		return nil, err
	}
	days, err := r.ActiveDays(ctx, tz)
	if err != nil {
		return nil, err
	}
	mastery, err := s.ChapterMastery(ctx, uid)
	if err != nil {
		return nil, err
	}
	level := LevelForXP(xp)
	return &ProgressSummary{
		XP: xp, Level: level, LevelFloorXP: XPForLevel(level), NextLevelXP: XPForLevel(level + 1),
		StreakDays: Streak(days, today), LongestStreakDays: LongestStreak(days), ActiveDays: len(days),
		Chapters: mastery,
	}, nil
}

type ActivityDay struct {
	Date       string `json:"date"`
	Lessons    int    `json:"lessons"`
	Runs       int    `json:"runs"`
	RunsPassed int    `json:"runs_passed"`
	Answers    int    `json:"answers"`
	XP         int    `json:"xp"`
	Level      int    `json:"level"`
}

// Activity renvoie une entrée par jour, du lundi de la plus ancienne semaine jusqu'à aujourd'hui.
func (s *Service) Activity(ctx context.Context, uid int64, today time.Time, weeks int, tz string) ([]ActivityDay, error) {
	since := ActivityStart(today, weeks)
	var out []ActivityDay
	index := map[time.Time]int{}
	for d := since; !d.After(today); d = addDays(d, 1) {
		index[d] = len(out)
		out = append(out, ActivityDay{Date: isoDate(d)})
	}

	r := s.repos().Progress(uid)
	events, err := r.XPEventsSince(ctx, since, tz)
	if err != nil {
		return nil, err
	}
	for _, e := range events {
		if i, ok := index[e.Day]; ok {
			out[i].XP += e.Amount
			if e.Kind == "lesson" {
				out[i].Lessons++
			}
		}
	}
	runs, err := r.RunsByDay(ctx, since, tz)
	if err != nil {
		return nil, err
	}
	for _, c := range runs {
		if i, ok := index[c.Day]; ok {
			out[i].Runs += c.Count
			out[i].RunsPassed += c.OK
		}
	}
	answers, err := r.AnswersByDay(ctx, since, tz)
	if err != nil {
		return nil, err
	}
	for _, c := range answers {
		if i, ok := index[c.Day]; ok {
			out[i].Answers += c.Count
		}
	}

	peak := 0
	for _, d := range out {
		peak = max(peak, d.Lessons+d.Runs+d.Answers)
	}
	for i := range out {
		out[i].Level = Intensity(out[i].Lessons+out[i].Runs+out[i].Answers, peak)
	}
	return out, nil
}

type Target struct {
	Type string `json:"type"`
	ID   string `json:"id"`
}

type FeedEvent struct {
	Kind   string `json:"kind"`
	At     string `json:"at"`
	Date   string `json:"date"`
	Title  string `json:"title"`
	Target Target `json:"target"`
	XP     int    `json:"xp"`
	Count  int    `json:"count"`
	OK     int    `json:"ok"`

	at time.Time
}

// Feed est le journal façon git log : leçons et TP réussis, exécutions et quiz regroupés par jour.
// day non nul : seulement ce jour-là.
func (s *Service) Feed(ctx context.Context, uid int64, today time.Time, tz string, day *time.Time, limit int) ([]FeedEvent, error) {
	since := addDays(today, -365)
	if day != nil {
		since = *day
	}
	events := []FeedEvent{}
	add := func(kind string, at, d time.Time, title string, target Target, xp, count, ok int) {
		events = append(events, FeedEvent{
			Kind: kind, At: pyISO(at), Date: isoDate(d), Title: title, Target: target,
			XP: xp, Count: count, OK: ok, at: at,
		})
	}
	type quizDay struct {
		quizID string
		day    time.Time
	}
	quizXP := map[quizDay]int{}

	r := s.repos().Progress(uid)
	xpEvents, err := r.XPEventsSince(ctx, since, tz)
	if err != nil {
		return nil, err
	}
	for _, e := range xpEvents {
		switch e.Kind {
		case "quiz":
			quizID, _, _ := strings.Cut(e.RefID, "/")
			quizXP[quizDay{quizID, e.Day}] += e.Amount
		case "lesson":
			if l := s.Content.Lessons[e.RefID]; l != nil {
				add("lesson_completed", e.CreatedAt, e.Day, l.Title, Target{"lesson", e.RefID}, e.Amount, 1, 0)
			}
		case "exercise":
			if ex := s.Content.Exercises[e.RefID]; ex != nil {
				add("exercise_passed", e.CreatedAt, e.Day, ex.Title, Target{"exercise", e.RefID}, e.Amount, 1, 0)
			}
		}
	}
	runs, err := r.RunsByDay(ctx, since, tz)
	if err != nil {
		return nil, err
	}
	for _, c := range runs {
		if ex := s.Content.Exercises[c.RefID]; ex != nil {
			add("exercise_runs", c.Last, c.Day, ex.Title, Target{"exercise", c.RefID}, 0, c.Count, c.OK)
		}
	}
	answers, err := r.AnswersByDay(ctx, since, tz)
	if err != nil {
		return nil, err
	}
	for _, c := range answers {
		quiz := s.Content.Quizzes[c.RefID]
		if quiz == nil {
			continue
		}
		if l := s.Content.Lessons[quiz.LessonID]; l != nil {
			add("quiz_answers", c.Last, c.Day, l.Title, Target{"lesson", l.ID}, quizXP[quizDay{c.RefID, c.Day}], c.Count, c.OK)
		}
	}

	if day != nil {
		events = slices.DeleteFunc(events, func(e FeedEvent) bool { return e.Date != isoDate(*day) })
	}
	slices.SortStableFunc(events, func(a, b FeedEvent) int { return b.at.Compare(a.at) })
	if len(events) > limit {
		events = events[:limit]
	}
	return events, nil
}
