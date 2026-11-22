package service

import (
	"context"
	"slices"

	"btd/backend/internal/content"
	"btd/backend/internal/model"
	"btd/backend/internal/repository"
)

// Points de contrôle : les questions posées dans le fil d'une leçon. Ils valident la leçon : quand le
// dernier est réussi, la leçon est terminée d'office (plus de bouton « Terminer » à cliquer sans preuve).
// Une réponse demandée avant de réussir ne rapporte plus l'XP du point de contrôle.

// CheckpointXP est l'XP d'un point de contrôle réussi sans avoir demandé la réponse (une seule fois).
const CheckpointXP = 3

// CheckpointView est une question posée dans le corps d'une leçon, sans réponse ni explication.
type CheckpointView struct {
	ID       string   `json:"id"`
	Type     string   `json:"type"`
	Prompt   string   `json:"prompt"`
	Code     *string  `json:"code"`
	Choices  []string `json:"choices"`
	Answered bool     `json:"answered"` // déjà réussi une fois
	Revealed bool     `json:"revealed"` // réponse déjà demandée
	Tried    bool     `json:"tried"`    // au moins un essai : la réponse peut être demandée
}

// LessonRequirement dit ce qui valide une leçon : ses points de contrôle, sinon les questions de son quiz, sinon rien.
type LessonRequirement struct {
	Kind  string `json:"kind"` // "checkpoints" | "quiz" | "none"
	Done  int    `json:"done"`
	Total int    `json:"total"`
}

// CheckpointResult corrige un point de contrôle. Sans réussite ni réponse demandée, la réponse attendue
// et l'explication restent cachées : on peut réessayer sans s'être fait souffler la solution.
type CheckpointResult struct {
	Correct     bool   `json:"correct"`
	Expected    any    `json:"expected"`
	Explanation string `json:"explanation"`
	XPAwarded   int    `json:"xp_awarded"`
	Revealed    bool   `json:"revealed"`
	// Leçon validée par cette réponse (le dernier point de contrôle) : l'XP de la leçon.
	LessonCompleted *XPAwarded `json:"lesson_completed,omitempty"`
}

// RevealView est la réponse d'un point de contrôle, demandée après un essai.
type RevealView struct {
	Expected    any    `json:"expected"`
	Explanation string `json:"explanation"`
}

func (s *Service) checkpointOf(lessonID, checkpointID string) (*content.Lesson, *content.QuizQuestion, error) {
	l := s.Content.Lessons[lessonID]
	if l == nil {
		return nil, nil, errorf(NotFound, "leçon introuvable")
	}
	i := slices.IndexFunc(l.Checkpoints, func(q content.QuizQuestion) bool { return q.ID == checkpointID })
	if i < 0 {
		return nil, nil, errorf(NotFound, "point de contrôle introuvable")
	}
	return l, &l.Checkpoints[i], nil
}

func (s *Service) checkpointViews(ctx context.Context, uid int64, l *content.Lesson) ([]CheckpointView, error) {
	out := []CheckpointView{}
	if len(l.Checkpoints) == 0 {
		return out, nil
	}
	states, err := s.repos().Progress(uid).CheckpointStates(ctx, l.ID)
	if err != nil {
		return nil, err
	}
	for _, c := range l.Checkpoints {
		st := states[c.ID]
		out = append(out, CheckpointView{
			ID: c.ID, Type: c.Type, Prompt: c.Prompt, Code: c.Code, Choices: c.Choices,
			Answered: st.Solved, Revealed: st.Revealed, Tried: st.Wrong > 0 || st.Solved,
		})
	}
	return out, nil
}

// requirementOf calcule ce qui valide la leçon et où en est l'utilisateur.
func (s *Service) requirementOf(ctx context.Context, r repository.Repos, uid int64, l *content.Lesson) (LessonRequirement, error) {
	if n := len(l.Checkpoints); n > 0 {
		states, err := r.Progress(uid).CheckpointStates(ctx, l.ID)
		if err != nil {
			return LessonRequirement{}, err
		}
		done := 0
		for _, c := range l.Checkpoints {
			if states[c.ID].Solved {
				done++
			}
		}
		return LessonRequirement{Kind: "checkpoints", Done: done, Total: n}, nil
	}
	if quiz := s.Content.Quizzes[l.QuizID]; quiz != nil && len(quiz.Questions) > 0 {
		first, err := r.Progress(uid).FirstAttempts(ctx)
		if err != nil {
			return LessonRequirement{}, err
		}
		done := 0
		for _, q := range quiz.Questions {
			if _, ok := first[model.QuestionKey{QuizID: quiz.ID, QuestionID: q.ID}]; ok {
				done++
			}
		}
		return LessonRequirement{Kind: "quiz", Done: done, Total: len(quiz.Questions)}, nil
	}
	return LessonRequirement{Kind: "none"}, nil
}

// AnswerCheckpoint corrige un point de contrôle. Les essais sont libres. La première réussite rapporte
// CheckpointXP, sauf si la réponse a été demandée avant ; la réussite du dernier point valide la leçon.
// Rien n'est écrit dans quiz_answers : la maîtrise du module n'en dépend pas.
func (s *Service) AnswerCheckpoint(ctx context.Context, uid int64, lessonID, checkpointID string, answer any) (*CheckpointResult, error) {
	l, c, err := s.checkpointOf(lessonID, checkpointID)
	if err != nil {
		return nil, err
	}
	correct, err := IsCorrect(*c, answer)
	if err != nil {
		return nil, errorf(Invalid, "type de question non corrigé automatiquement : %s", err)
	}
	res := &CheckpointResult{Correct: correct}
	err = s.store.InTx(ctx, func(r repository.Repos) error {
		st, err := r.Progress(uid).RecordCheckpoint(ctx, l.ID, c.ID, correct)
		if err != nil {
			return err
		}
		res.Revealed = st.Revealed
		if !correct {
			return nil
		}
		if !st.Revealed {
			if res.XPAwarded, err = r.Progress(uid).AwardXP(ctx, "checkpoint", l.ID+"/"+c.ID, CheckpointXP); err != nil {
				return err
			}
		}
		req, err := s.requirementOf(ctx, r, uid, l)
		if err != nil || req.Done < req.Total {
			return err
		}
		done, err := r.Progress(uid).CompletedLessons(ctx)
		if err != nil || done[l.ID] {
			return err
		}
		xp, err := completeLesson(ctx, r, uid, l)
		res.LessonCompleted = &XPAwarded{xp}
		return err
	})
	if err != nil {
		return nil, err
	}
	if correct || res.Revealed {
		res.Expected, res.Explanation = c.Answer, c.Explanation
	}
	return res, nil
}

// RevealCheckpoint donne la réponse d'un point de contrôle déjà tenté au moins une fois.
// Une réussite qui suit ne rapporte plus d'XP (mais valide toujours le point pour la leçon).
func (s *Service) RevealCheckpoint(ctx context.Context, uid int64, lessonID, checkpointID string) (*RevealView, error) {
	l, c, err := s.checkpointOf(lessonID, checkpointID)
	if err != nil {
		return nil, err
	}
	_, ok, err := s.repos().Progress(uid).RevealCheckpoint(ctx, l.ID, c.ID)
	if err != nil {
		return nil, err
	}
	if !ok {
		return nil, errorf(Conflict, "propose d'abord une réponse")
	}
	return &RevealView{Expected: c.Answer, Explanation: c.Explanation}, nil
}
