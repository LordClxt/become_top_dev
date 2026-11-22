package service

import (
	"context"
	"slices"
	"time"

	"btd/backend/internal/content"
	"btd/backend/internal/model"
	"btd/backend/internal/repository"
)

// Répétition espacée (Leitner) sur les flashcards des leçons.

const (
	NewCardsPerDay = 10 // cartes jamais vues introduites par jour
	ReviewBatch    = 30 // cartes par réponse de GET /api/review
	ReviewXP       = 1  // par carte et par jour
)

type cardRef struct {
	lesson *content.Lesson
	card   content.Flashcard
}

// indexCards parcourt les cours dans l'ordre conseillé : les nouvelles cartes arrivent dans l'ordre du parcours.
func (s *Service) indexCards() {
	s.cards = map[string]cardRef{}
	if s.Content == nil {
		return
	}
	for _, course := range s.orderedCourses() {
		for _, chID := range course.ChapterIDs {
			for _, lid := range s.Content.Chapters[chID].LessonIDs {
				l := s.Content.Lessons[lid]
				for _, c := range l.Flashcards {
					id := CardID(l.ID, c.ID)
					if _, dup := s.cards[id]; !dup {
						s.cards[id] = cardRef{l, c}
						s.cardOrder = append(s.cardOrder, id)
					}
				}
			}
		}
	}
}

type ReviewCard struct {
	ID          string `json:"id"`
	Kind        string `json:"kind"` // "card" (carte mémo, auto-évaluée) | "question" (erreur à rejouer)
	Front       string `json:"front"`
	Back        string `json:"back"`
	Concept     string `json:"concept"`
	LessonID    string `json:"lesson_id"`
	LessonTitle string `json:"lesson_title"`
	CourseTitle string `json:"course_title"`
	Box         int    `json:"box"`
	IsNew       bool   `json:"is_new"`
	// Question de quiz ou point de contrôle à rejouer (Kind = "question") ; on y répond, la correction décide.
	Question *ReviewQuestion `json:"question,omitempty"`
}

type ReviewQueue struct {
	Cards     []ReviewCard `json:"cards"`
	DueCount  int          `json:"due_count"`
	NewCount  int          `json:"new_count"`
	NextDueOn *string      `json:"next_due_on"`
	Tracked   int          `json:"tracked"`
}

func (s *Service) reviewCard(id string, box int) ReviewCard {
	if q, ok := s.questionCard(id); ok {
		return s.reviewQuestionCard(id, q, box)
	}
	ref := s.cards[id]
	course := s.Content.Courses[s.Content.Chapters[ref.lesson.ChapterID].CourseID]
	return ReviewCard{
		ID: id, Kind: "card", Front: ref.card.Front, Back: ref.card.Back, Concept: ref.card.Concept, LessonID: ref.lesson.ID,
		LessonTitle: ref.lesson.Title, CourseTitle: course.Title, Box: box, IsNew: box == 0,
	}
}

// reviewState : cartes dues (les plus en retard d'abord), nouvelles cartes disponibles aujourd'hui, prochaine échéance.
type reviewState struct {
	due       []model.CardReview
	fresh     []string // nouvelles cartes encore introductibles aujourd'hui
	nextDueOn *time.Time
	tracked   int
}

func (s *Service) reviewState(ctx context.Context, uid int64, today time.Time, tz string) (*reviewState, error) {
	r := s.repos().Progress(uid)
	rows, err := r.CardReviews(ctx, tz)
	if err != nil {
		return nil, err
	}
	done, err := r.CompletedLessons(ctx)
	if err != nil {
		return nil, err
	}
	st := &reviewState{tracked: len(rows)}
	tracked := map[string]bool{}
	newToday := 0
	for _, c := range rows {
		tracked[c.CardID] = true
		_, flash := s.cards[c.CardID]
		if flash && c.CreatedOn.Equal(today) {
			newToday++ // les erreurs remises en révision ne prennent pas la place des nouvelles cartes
		}
		if _, question := s.questionCard(c.CardID); !flash && !question {
			continue // carte retirée du contenu
		}
		if !c.DueOn.After(today) {
			st.due = append(st.due, c)
		} else if st.nextDueOn == nil || c.DueOn.Before(*st.nextDueOn) {
			st.nextDueOn = &c.DueOn
		}
	}
	quota := max(0, NewCardsPerDay-newToday)
	for _, id := range s.cardOrder {
		if len(st.fresh) == quota {
			break
		}
		if !tracked[id] && done[s.cards[id].lesson.ID] {
			st.fresh = append(st.fresh, id)
		}
	}
	return st, nil
}

func (s *Service) Review(ctx context.Context, uid int64, today time.Time, tz string) (*ReviewQueue, error) {
	st, err := s.reviewState(ctx, uid, today, tz)
	if err != nil {
		return nil, err
	}
	q := &ReviewQueue{Cards: []ReviewCard{}, DueCount: len(st.due), NewCount: len(st.fresh), Tracked: st.tracked}
	if st.nextDueOn != nil {
		q.NextDueOn = new(isoDate(*st.nextDueOn))
	}
	for _, c := range st.due {
		if len(q.Cards) == ReviewBatch {
			break
		}
		q.Cards = append(q.Cards, s.reviewCard(c.CardID, c.Box))
	}
	for _, id := range st.fresh {
		if len(q.Cards) == ReviewBatch {
			break
		}
		q.Cards = append(q.Cards, s.reviewCard(id, 0))
	}
	return q, nil
}

type ReviewResult struct {
	Box       int    `json:"box"`
	DueOn     string `json:"due_on"`
	XPAwarded int    `json:"xp_awarded"`
}

// RateCard enregistre une révision. Une carte d'une leçon pas encore terminée est acceptée (entraînement
// depuis la page de la leçon). L'XP n'est gagnée qu'une fois par carte et par jour.
func (s *Service) RateCard(ctx context.Context, uid int64, today time.Time, cardID string, known bool) (*ReviewResult, error) {
	if _, ok := s.cards[cardID]; !ok {
		if _, question := s.questionCard(cardID); question {
			return nil, errorf(Invalid, "carte question : envoie une réponse (answer)")
		}
		return nil, errorf(NotFound, "carte introuvable")
	}
	var res ReviewResult
	err := s.store.InTx(ctx, func(r repository.Repos) error {
		var err error
		res, err = rateCard(ctx, r, uid, today, cardID, known)
		return err
	})
	if err != nil {
		return nil, err
	}
	return &res, nil
}

// rateCard fait avancer une carte dans les boîtes de Leitner ; l'XP n'est gagnée qu'une fois par carte et par jour.
func rateCard(ctx context.Context, r repository.Repos, uid int64, today time.Time, cardID string, known bool) (ReviewResult, error) {
	p := r.Progress(uid)
	c, _, err := p.CardReview(ctx, cardID)
	if err != nil {
		return ReviewResult{}, err
	}
	box, due, lapse := NextReview(c.Box, known, today)
	c.Box, c.DueOn = box, due
	c.Reviews++
	if lapse {
		c.Lapses++
	}
	if err := p.SaveCardReview(ctx, c); err != nil {
		return ReviewResult{}, err
	}
	res := ReviewResult{Box: box, DueOn: isoDate(due)}
	res.XPAwarded, err = p.AwardXP(ctx, "review", datedRef(today, cardID), ReviewXP)
	return res, err
}

// cardsInLessons compte les flashcards des leçons données.
func (s *Service) cardsInLessons(lessons map[string]bool) int {
	return len(slices.DeleteFunc(slices.Clone(s.cardOrder), func(id string) bool { return !lessons[s.cards[id].lesson.ID] }))
}
