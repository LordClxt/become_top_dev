package service

import (
	"context"
	"slices"
	"strings"
	"time"

	"btd/backend/internal/model"
)

// « Aujourd'hui » : objectif quotidien, semaine, quêtes, coffre et prochaine étape conseillée.

// learningXP dit si un événement compte pour l'objectif du jour. L'XP des quêtes et du coffre en est exclue :
// sinon « atteins ton objectif » se validerait avec la récompense d'une autre quête (progression circulaire).
// xp_today, goal_met, week[].xp et la quête "goal" utilisent tous cette même règle.
func learningXP(kind string) bool { return kind != "quest" && kind != "chest" }

type WeekDayView struct {
	Date    string `json:"date"`
	XP      int    `json:"xp"`
	Active  bool   `json:"active"`
	GoalMet bool   `json:"goal_met"`
	Future  bool   `json:"future"`
}

type QuestView struct {
	ID      string `json:"id"`
	Title   string `json:"title"`
	Have    int    `json:"have"`
	Need    int    `json:"need"`
	XP      int    `json:"xp"`
	Done    bool   `json:"done"`
	Claimed bool   `json:"claimed"`
}

type ChestView struct {
	Ready   bool `json:"ready"`
	Claimed bool `json:"claimed"`
	XP      *int `json:"xp"` // dévoilé une fois réclamé
}

type ContinueView struct {
	Type         string `json:"type"` // lesson | exercise | chapter
	ID           string `json:"id"`
	Title        string `json:"title"`
	Label        string `json:"label"`
	CourseID     string `json:"course_id"`
	CourseTitle  string `json:"course_title"`
	ChapterID    string `json:"chapter_id"`
	ChapterTitle string `json:"chapter_title"`
	// Anchor : section où reprendre une leçon commencée (vide sinon) ; le lien du « Continuer » y pointe.
	Anchor string `json:"anchor,omitempty"`
}

type TodayView struct {
	Date         string        `json:"date"`
	GoalXP       int           `json:"goal_xp"`
	XPToday      int           `json:"xp_today"`
	GoalMet      bool          `json:"goal_met"`
	StreakDays   int           `json:"streak_days"`
	StreakAtRisk bool          `json:"streak_at_risk"`
	Week         []WeekDayView `json:"week"`
	Quests       []QuestView   `json:"quests"`
	Chest        ChestView     `json:"chest"`
	ReviewDue    int           `json:"review_due"`
	Continue     *ContinueView `json:"continue"`
}

func (s *Service) Today(ctx context.Context, uid int64, today time.Time, tz string) (*TodayView, error) {
	r := s.repos().Progress(uid)
	goal, err := s.repos().Profile(uid).DailyGoal(ctx)
	if err != nil {
		return nil, err
	}
	week := WeekDays(today)
	events, err := r.XPEventsSince(ctx, week[0], tz)
	if err != nil {
		return nil, err
	}
	days, err := r.ActiveDays(ctx, tz)
	if err != nil {
		return nil, err
	}
	active := map[time.Time]bool{}
	for _, d := range days {
		active[d] = true
	}

	v := &TodayView{Date: isoDate(today), GoalXP: goal, StreakDays: Streak(days, today), Week: []WeekDayView{}}
	v.StreakAtRisk = v.StreakDays > 0 && !active[today]
	dayXP := map[time.Time]int{}
	var todays []model.XPEvent
	for _, e := range events {
		if learningXP(e.Kind) {
			dayXP[e.Day] += e.Amount
		}
		if e.Day.Equal(today) {
			todays = append(todays, e)
		}
	}
	v.XPToday = dayXP[today]
	v.GoalMet = v.XPToday >= goal
	for _, d := range week {
		v.Week = append(v.Week, WeekDayView{
			Date: isoDate(d), XP: dayXP[d], Active: active[d], GoalMet: dayXP[d] >= goal, Future: d.After(today),
		})
	}

	st, err := s.reviewState(ctx, uid, today, tz)
	if err != nil {
		return nil, err
	}
	v.ReviewDue = len(st.due)

	if v.Quests, err = s.quests(ctx, uid, today, tz, goal, v.XPToday, todays); err != nil {
		return nil, err
	}
	chestRefs, err := r.XPRefs(ctx, "chest", isoDate(today))
	if err != nil {
		return nil, err
	}
	v.Chest.Ready = !slices.ContainsFunc(v.Quests, func(q QuestView) bool { return !q.Done })
	if v.Chest.Claimed = chestRefs[isoDate(today)]; v.Chest.Claimed {
		v.Chest.XP = new(ChestXP(uid, today))
	}
	if v.Continue, err = s.nextStep(ctx, uid); err != nil {
		return nil, err
	}
	return v, nil
}

// questPool retire les quêtes que le contenu rend impossibles aujourd'hui. Seul l'état d'avant aujourd'hui
// compte (leçons terminées les jours précédents), pour que le tirage reste le même toute la journée.
func (s *Service) questPool(ctx context.Context, uid int64, today time.Time, tz string) ([]QuestDef, error) {
	completions, err := s.repos().Progress(uid).LessonCompletions(ctx, tz)
	if err != nil {
		return nil, err
	}
	before := map[string]bool{}
	for id, day := range completions {
		if day.Before(today) {
			before[id] = true
		}
	}
	remaining := len(s.Content.Lessons) - len(before)
	cards := s.cardsInLessons(before)
	return slices.DeleteFunc(slices.Clone(QuestPool), func(q QuestDef) bool {
		switch q.Metric {
		case MetricLessons:
			return remaining < q.Need
		case MetricReviews:
			return cards < q.Need
		}
		return false
	}), nil
}

func (s *Service) quests(ctx context.Context, uid int64, today time.Time, tz string, goal, xpToday int, todays []model.XPEvent) ([]QuestView, error) {
	r := s.repos().Progress(uid)
	pool, err := s.questPool(ctx, uid, today, tz)
	if err != nil {
		return nil, err
	}
	progress, err := r.AllExerciseProgress(ctx)
	if err != nil {
		return nil, err
	}
	have := map[Metric]int{MetricGoal: xpToday}
	for _, e := range todays {
		switch e.Kind {
		case "lesson":
			have[MetricLessons]++
		case "exercise":
			have[MetricExercises]++
			if progress[e.RefID].HintsRevealed == 0 {
				have[MetricCleanExercise]++
			}
		case "checkpoint":
			have[MetricAnswers]++
		case "review":
			have[MetricReviews]++
		}
	}
	runs, err := r.RunsByDay(ctx, today, tz)
	if err != nil {
		return nil, err
	}
	for _, c := range runs {
		have[MetricRuns] += c.Count
	}
	answers, err := r.AnswersByDay(ctx, today, tz)
	if err != nil {
		return nil, err
	}
	for _, c := range answers {
		have[MetricAnswers] += c.OK
	}
	claimed, err := r.XPRefs(ctx, "quest", isoDate(today)+"/")
	if err != nil {
		return nil, err
	}
	out := []QuestView{}
	for _, q := range PickQuests(uid, today, pool) {
		need := q.Need
		if q.Metric == MetricGoal {
			need = goal
		}
		h := min(have[q.Metric], need)
		out = append(out, QuestView{
			ID: q.ID, Title: q.Title, Have: h, Need: need, XP: q.XP, Done: h >= need,
			Claimed: claimed[datedRef(today, q.ID)],
		})
	}
	return out, nil
}

// ClaimQuest encaisse une quête du jour terminée. 404 si elle n'est pas proposée aujourd'hui, 409 sinon.
func (s *Service) ClaimQuest(ctx context.Context, uid int64, today time.Time, tz, questID string) (*XPAwarded, error) {
	v, err := s.Today(ctx, uid, today, tz)
	if err != nil {
		return nil, err
	}
	i := slices.IndexFunc(v.Quests, func(q QuestView) bool { return q.ID == questID })
	if i < 0 {
		return nil, errorf(NotFound, "quête introuvable aujourd'hui")
	}
	q := v.Quests[i]
	if !q.Done {
		return nil, errorf(Conflict, "quête pas encore terminée")
	}
	if q.Claimed {
		return nil, errorf(Conflict, "quête déjà réclamée")
	}
	return s.claim(ctx, uid, "quest", datedRef(today, q.ID), q.XP)
}

// ClaimChest ouvre le coffre du jour, une fois les trois quêtes terminées.
func (s *Service) ClaimChest(ctx context.Context, uid int64, today time.Time, tz string) (*XPAwarded, error) {
	v, err := s.Today(ctx, uid, today, tz)
	if err != nil {
		return nil, err
	}
	if !v.Chest.Ready {
		return nil, errorf(Conflict, "termine les trois quêtes pour ouvrir le coffre")
	}
	if v.Chest.Claimed {
		return nil, errorf(Conflict, "coffre déjà ouvert")
	}
	return s.claim(ctx, uid, "chest", isoDate(today), ChestXP(uid, today))
}

func (s *Service) claim(ctx context.Context, uid int64, kind, ref string, amount int) (*XPAwarded, error) {
	xp, err := s.repos().Progress(uid).AwardXP(ctx, kind, ref, amount)
	if err != nil {
		return nil, err
	}
	if xp == 0 { // réclamé entre-temps par une requête concurrente
		return nil, errorf(Conflict, "déjà réclamé")
	}
	return &XPAwarded{xp}, nil
}

// --- Continuer ---------------------------------------------------------------

// touchedLesson renvoie la leçon (ou à défaut le chapitre) concernée par une trace d'activité.
func (s *Service) touchedLesson(t model.Touch) (lessonID, chapterID string) {
	switch t.Kind {
	case "lesson":
		lessonID = t.RefID
	case "checkpoint":
		lessonID, _, _ = strings.Cut(t.RefID, "/")
	case "quiz":
		quizID, _, _ := strings.Cut(t.RefID, "/")
		if q := s.Content.Quizzes[quizID]; q != nil {
			lessonID = q.LessonID
		}
	case "review":
		_, card, _ := strings.Cut(t.RefID, "/")
		if ref, ok := s.cards[card]; ok {
			lessonID = ref.lesson.ID
		}
	case "exercise", "draft", "bonus":
		id := t.RefID
		if t.Kind == "bonus" {
			_, id, _ = strings.Cut(t.RefID, "/")
		}
		if ex := s.Content.Exercises[id]; ex != nil {
			return ex.LessonID, ex.ChapterID
		}
	}
	if l := s.Content.Lessons[lessonID]; l != nil {
		return l.ID, l.ChapterID
	}
	return "", ""
}

// nextStep : le chapitre touché le plus récemment et pas encore maîtrisé, sinon le premier chapitre débloqué
// non maîtrisé dans l'ordre conseillé ; dedans, la première étape non faite. nil quand tout est maîtrisé.
func (s *Service) nextStep(ctx context.Context, uid int64) (*ContinueView, error) {
	r := s.repos().Progress(uid)
	mastery, err := s.ChapterMastery(ctx, uid)
	if err != nil {
		return nil, err
	}
	touches, err := r.RecentTouches(ctx, 200)
	if err != nil {
		return nil, err
	}
	open := func(id string) bool { m := mastery[id]; return m != nil && m.Unlocked && !m.Mastered }
	touchedLessons := map[string]bool{}
	chapterID := ""
	for _, t := range touches {
		lid, cid := s.touchedLesson(t)
		if lid != "" {
			touchedLessons[lid] = true
		}
		if chapterID == "" && open(cid) {
			chapterID = cid
		}
	}
	if chapterID == "" {
		for _, c := range s.orderedCourses() {
			if i := slices.IndexFunc(c.ChapterIDs, open); i >= 0 {
				chapterID = c.ChapterIDs[i]
				break
			}
		}
	}
	if chapterID == "" {
		return nil, nil
	}
	done, err := r.CompletedLessons(ctx)
	if err != nil {
		return nil, err
	}
	passed, err := s.passedExercises(ctx, uid)
	if err != nil {
		return nil, err
	}
	ch := s.Content.Chapters[chapterID]
	course := s.Content.Courses[ch.CourseID]
	view := func(typ, id, title, label string) *ContinueView {
		return &ContinueView{Type: typ, ID: id, Title: title, Label: label, CourseID: course.ID, CourseTitle: course.Title,
			ChapterID: ch.ID, ChapterTitle: ch.Title}
	}
	readings, err := r.Readings(ctx)
	if err != nil {
		return nil, err
	}
	for _, lid := range ch.LessonIDs {
		if !done[lid] {
			label := "Leçon suivante"
			if touchedLessons[lid] {
				label = "Reprendre la leçon"
			}
			v := view("lesson", lid, s.Content.Lessons[lid].Title, label)
			if rd, ok := readings[lid]; ok && rd.Progress > 0 {
				v.Label, v.Anchor = "Reprendre la leçon", rd.Anchor
			}
			return v, nil
		}
	}
	for _, lid := range ch.LessonIDs {
		for _, lab := range s.Content.Lessons[lid].Labs {
			if !passed[lab] {
				return view("exercise", lab, s.Content.Exercises[lab].Title, "TP à finir"), nil
			}
		}
	}
	for _, step := range []struct{ id, label string }{
		{ch.AssignmentID, "Devoir du module"}, {ch.ProjectID, "Projet du module"}, {ch.BossID, "Boss du module"},
	} {
		if step.id != "" && !passed[step.id] {
			return view("exercise", step.id, s.Content.Exercises[step.id].Title, step.label), nil
		}
	}
	return view("chapter", ch.ID, ch.Title, "Consolide le module"), nil
}
