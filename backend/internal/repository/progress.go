package repository

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"

	"btd/backend/internal/model"
)

type ProgressRepo struct {
	db DBTX
}

// localDay est le jour calendaire de l'horodatage dans le fuseau de l'utilisateur
// (sinon une session à 0 h 30 compte la veille). $1 est toujours le fuseau.
const localDay = "date(timezone($1, created_at))"

// --- XP ----------------------------------------------------------------------

// AwardXP attribue l'XP une seule fois par (kind, refID). Renvoie l'XP réellement gagnée.
func (r *ProgressRepo) AwardXP(ctx context.Context, kind, refID string, amount int) (int, error) {
	var got int
	err := r.db.QueryRow(ctx, `
		INSERT INTO xp_events (kind, ref_id, amount) VALUES ($1, $2, $3)
		ON CONFLICT (kind, ref_id) DO NOTHING RETURNING amount`, kind, refID, amount).Scan(&got)
	if errors.Is(err, pgx.ErrNoRows) {
		return 0, nil
	}
	return got, err
}

func (r *ProgressRepo) TotalXP(ctx context.Context) (int, error) {
	var total int
	err := r.db.QueryRow(ctx, `SELECT COALESCE(SUM(amount), 0) FROM xp_events`).Scan(&total)
	return total, err
}

// ActiveDays renvoie les jours avec au moins une action (XP, exécution de TP, réponse de quiz), du plus récent au plus ancien.
func (r *ProgressRepo) ActiveDays(ctx context.Context, tz string) ([]time.Time, error) {
	rows, err := r.db.Query(ctx, `
		SELECT `+localDay+` FROM xp_events
		UNION SELECT `+localDay+` FROM exercise_runs
		UNION SELECT `+localDay+` FROM quiz_answers
		ORDER BY 1 DESC`, tz)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, pgx.RowTo[time.Time])
}

// --- Activité ----------------------------------------------------------------

func (r *ProgressRepo) XPEventsSince(ctx context.Context, since time.Time, tz string) ([]model.XPEvent, error) {
	rows, err := r.db.Query(ctx, `
		SELECT kind, ref_id, amount, created_at, `+localDay+` AS day FROM xp_events
		WHERE `+localDay+` >= $2 ORDER BY created_at`, tz, since)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (model.XPEvent, error) {
		var e model.XPEvent
		err := row.Scan(&e.Kind, &e.RefID, &e.Amount, &e.CreatedAt, &e.Day)
		return e, err
	})
}

// RunsByDay : (exercice, jour) → nombre d'exécutions, dont réussies, et heure de la dernière.
func (r *ProgressRepo) RunsByDay(ctx context.Context, since time.Time, tz string) ([]model.DayCount, error) {
	return r.countByDay(ctx, `
		SELECT exercise_id, `+localDay+` AS day, count(*), count(*) FILTER (WHERE passed), max(created_at)
		FROM exercise_runs WHERE `+localDay+` >= $2 GROUP BY exercise_id, day`, since, tz)
}

// AnswersByDay : (quiz, jour) → nombre de réponses, dont correctes, et heure de la dernière.
func (r *ProgressRepo) AnswersByDay(ctx context.Context, since time.Time, tz string) ([]model.DayCount, error) {
	return r.countByDay(ctx, `
		SELECT quiz_id, `+localDay+` AS day, count(*), count(*) FILTER (WHERE correct), max(created_at)
		FROM quiz_answers WHERE `+localDay+` >= $2 GROUP BY quiz_id, day`, since, tz)
}

func (r *ProgressRepo) countByDay(ctx context.Context, query string, since time.Time, tz string) ([]model.DayCount, error) {
	rows, err := r.db.Query(ctx, query, tz, since)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (model.DayCount, error) {
		var c model.DayCount
		err := row.Scan(&c.RefID, &c.Day, &c.Count, &c.OK, &c.Last)
		return c, err
	})
}

// --- Leçons ------------------------------------------------------------------

func (r *ProgressRepo) CompleteLesson(ctx context.Context, lessonID string) error {
	_, err := r.db.Exec(ctx, `INSERT INTO lesson_progress (lesson_id) VALUES ($1) ON CONFLICT DO NOTHING`, lessonID)
	return err
}

func (r *ProgressRepo) CompletedLessons(ctx context.Context) (map[string]bool, error) {
	rows, err := r.db.Query(ctx, `SELECT lesson_id FROM lesson_progress`)
	if err != nil {
		return nil, err
	}
	ids, err := pgx.CollectRows(rows, pgx.RowTo[string])
	done := make(map[string]bool, len(ids))
	for _, id := range ids {
		done[id] = true
	}
	return done, err
}

// --- Exercices ---------------------------------------------------------------

const exerciseColumns = `exercise_id, draft, hints_revealed, attempts, passed_at`

func scanExercise(row pgx.Row) (model.ExerciseProgress, error) {
	var p model.ExerciseProgress
	var draft []byte
	if err := row.Scan(&p.ExerciseID, &draft, &p.HintsRevealed, &p.Attempts, &p.PassedAt); err != nil {
		return p, err
	}
	if draft != nil && string(draft) != "null" {
		if err := json.Unmarshal(draft, &p.Draft); err != nil {
			return p, err
		}
	}
	return p, nil
}

// ExerciseProgress renvoie la progression d'un exercice, vide s'il n'a jamais été ouvert.
// forUpdate verrouille la ligne jusqu'à la fin de la transaction.
func (r *ProgressRepo) ExerciseProgress(ctx context.Context, exerciseID string, forUpdate bool) (model.ExerciseProgress, error) {
	query := `SELECT ` + exerciseColumns + ` FROM exercise_progress WHERE exercise_id = $1`
	if forUpdate {
		query += ` FOR UPDATE`
	}
	p, err := scanExercise(r.db.QueryRow(ctx, query, exerciseID))
	if errors.Is(err, pgx.ErrNoRows) {
		return model.ExerciseProgress{ExerciseID: exerciseID}, nil
	}
	return p, err
}

func (r *ProgressRepo) AllExerciseProgress(ctx context.Context) (map[string]model.ExerciseProgress, error) {
	rows, err := r.db.Query(ctx, `SELECT `+exerciseColumns+` FROM exercise_progress`)
	if err != nil {
		return nil, err
	}
	list, err := pgx.CollectRows(rows, func(row pgx.CollectableRow) (model.ExerciseProgress, error) {
		return scanExercise(row)
	})
	out := make(map[string]model.ExerciseProgress, len(list))
	for _, p := range list {
		out[p.ExerciseID] = p
	}
	return out, err
}

func (r *ProgressRepo) SaveExerciseProgress(ctx context.Context, p model.ExerciseProgress) error {
	var draft any // NULL SQL sans brouillon
	if p.Draft != nil {
		raw, err := json.Marshal(p.Draft)
		if err != nil {
			return err
		}
		draft = string(raw)
	}
	_, err := r.db.Exec(ctx, `
		INSERT INTO exercise_progress (exercise_id, draft, hints_revealed, attempts, passed_at)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (exercise_id) DO UPDATE SET draft = EXCLUDED.draft, hints_revealed = EXCLUDED.hints_revealed,
			attempts = EXCLUDED.attempts, passed_at = EXCLUDED.passed_at, updated_at = now()`,
		p.ExerciseID, draft, p.HintsRevealed, p.Attempts, p.PassedAt)
	return err
}

func (r *ProgressRepo) AddRun(ctx context.Context, run model.ExerciseRun) error {
	files, err := json.Marshal(run.Files)
	if err != nil {
		return err
	}
	report, err := json.Marshal(run.Report)
	if err != nil {
		return err
	}
	_, err = r.db.Exec(ctx, `
		INSERT INTO exercise_runs (exercise_id, passed, duration_ms, files, report) VALUES ($1, $2, $3, $4, $5)`,
		run.ExerciseID, run.Passed, run.DurationMs, string(files), string(report))
	return err
}

// --- Quiz --------------------------------------------------------------------

func (r *ProgressRepo) HasAnswered(ctx context.Context, quizID, questionID string) (bool, error) {
	var ok bool
	err := r.db.QueryRow(ctx,
		`SELECT EXISTS (SELECT 1 FROM quiz_answers WHERE quiz_id = $1 AND question_id = $2)`, quizID, questionID).Scan(&ok)
	return ok, err
}

func (r *ProgressRepo) AddAnswer(ctx context.Context, a model.QuizAnswer) error {
	answer, err := json.Marshal(a.Answer)
	if err != nil {
		return err
	}
	_, err = r.db.Exec(ctx, `
		INSERT INTO quiz_answers (quiz_id, question_id, answer, correct, first_attempt) VALUES ($1, $2, $3, $4, $5)`,
		a.QuizID, a.QuestionID, string(answer), a.Correct, a.FirstAttempt)
	return err
}

// FirstAttempts : (quiz, question) → la première réponse était-elle correcte ?
func (r *ProgressRepo) FirstAttempts(ctx context.Context) (map[model.QuestionKey]bool, error) {
	rows, err := r.db.Query(ctx, `SELECT quiz_id, question_id, correct FROM quiz_answers WHERE first_attempt`)
	if err != nil {
		return nil, err
	}
	out := map[model.QuestionKey]bool{}
	var k model.QuestionKey
	var ok bool
	_, err = pgx.ForEachRow(rows, []any{&k.QuizID, &k.QuestionID, &ok}, func() error {
		out[k] = ok
		return nil
	})
	return out, err
}
