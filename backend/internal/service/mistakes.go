package service

import (
	"context"
	"slices"
	"strings"
	"time"

	"btd/backend/internal/content"
	"btd/backend/internal/repository"
)

// Les erreurs reviennent en révision : une question de quiz ratée, ou un point de contrôle raté ou dont la
// réponse a été demandée, devient une carte « question » de la file de Leitner. En révision, on y répond
// pour de vrai (pas d'auto-évaluation) : la correction décide de la boîte suivante.

const (
	quizCardPrefix       = "quiz:"       // quiz:<quizId>/<questionId>
	checkpointCardPrefix = "checkpoint:" // checkpoint:<lessonId>/<checkpointId>
)

func quizCardID(quizID, questionID string) string { return quizCardPrefix + quizID + "/" + questionID }
func checkpointCardID(lessonID, checkpointID string) string {
	return checkpointCardPrefix + lessonID + "/" + checkpointID
}

type questionRef struct {
	lesson *content.Lesson
	q      content.QuizQuestion
	source string // "quiz" | "checkpoint"
}

// questionCard retrouve la question derrière une carte d'erreur ; ok = false pour une flashcard ou une question
// retirée du contenu.
func (s *Service) questionCard(id string) (questionRef, bool) {
	var source, rest string
	switch {
	case strings.HasPrefix(id, quizCardPrefix):
		source, rest = "quiz", strings.TrimPrefix(id, quizCardPrefix)
	case strings.HasPrefix(id, checkpointCardPrefix):
		source, rest = "checkpoint", strings.TrimPrefix(id, checkpointCardPrefix)
	default:
		return questionRef{}, false
	}
	parent, qid, ok := strings.Cut(rest, "/")
	if !ok {
		return questionRef{}, false
	}
	var lesson *content.Lesson
	var questions []content.QuizQuestion
	if source == "quiz" {
		quiz := s.Content.Quizzes[parent]
		if quiz == nil {
			return questionRef{}, false
		}
		lesson, questions = s.Content.Lessons[quiz.LessonID], quiz.Questions
	} else {
		lesson = s.Content.Lessons[parent]
		if lesson != nil {
			questions = lesson.Checkpoints
		}
	}
	i := slices.IndexFunc(questions, func(q content.QuizQuestion) bool { return q.ID == qid })
	if lesson == nil || i < 0 {
		return questionRef{}, false
	}
	return questionRef{lesson, questions[i], source}, true
}

// ReviewQuestion est une question de quiz ou un point de contrôle à rejouer, sans la réponse.
type ReviewQuestion struct {
	Source   string   `json:"source"`   // "quiz" | "checkpoint"
	Language string   `json:"language"` // langage des extraits de code (coloration)
	Type     string   `json:"type"`
	Prompt   string   `json:"prompt"`
	Code     *string  `json:"code"`
	Choices  []string `json:"choices"`
}

func (s *Service) reviewQuestionCard(id string, ref questionRef, box int) ReviewCard {
	course := s.Content.Courses[s.Content.Chapters[ref.lesson.ChapterID].CourseID]
	return ReviewCard{
		ID: id, Kind: "question", Front: ref.q.Prompt, LessonID: ref.lesson.ID, LessonTitle: ref.lesson.Title,
		CourseTitle: course.Title, Box: box,
		Question: &ReviewQuestion{Source: ref.source, Language: s.lessonLanguage(ref.lesson.ID), Type: ref.q.Type, Prompt: ref.q.Prompt, Code: ref.q.Code, Choices: ref.q.Choices},
	}
}

// ReviewAnswer corrige une carte « question » rejouée en révision.
type ReviewAnswer struct {
	Correct     bool   `json:"correct"`
	Expected    any    `json:"expected"`
	Explanation string `json:"explanation"`
	ReviewResult
}

// AnswerReviewQuestion corrige une carte d'erreur : juste, elle monte d'une boîte ; fausse, elle revient demain.
func (s *Service) AnswerReviewQuestion(ctx context.Context, uid int64, today time.Time, cardID string, answer any) (*ReviewAnswer, error) {
	ref, ok := s.questionCard(cardID)
	if !ok {
		if _, flash := s.cards[cardID]; flash {
			return nil, errorf(Invalid, "carte mémo : note-la avec rating")
		}
		return nil, errorf(NotFound, "carte introuvable")
	}
	correct, err := IsCorrect(ref.q, answer)
	if err != nil {
		return nil, errorf(Invalid, "type de question non corrigé automatiquement : %s", err)
	}
	res := &ReviewAnswer{Correct: correct, Expected: ref.q.Answer, Explanation: ref.q.Explanation}
	err = s.store.InTx(ctx, func(r repository.Repos) error {
		res.ReviewResult, err = rateCard(ctx, r, uid, today, cardID, correct)
		return err
	})
	if err != nil {
		return nil, err
	}
	return res, nil
}

// enqueueMistake met une question ratée en révision (dans la transaction de la réponse).
func enqueueMistake(ctx context.Context, r repository.Repos, uid int64, cardID string) error {
	return r.Progress(uid).EnqueueMistake(ctx, cardID)
}
