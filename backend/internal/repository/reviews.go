package repository

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"

	"btd/backend/internal/model"
)

// --- Répétition espacée (cartes) ---------------------------------------------

const cardColumns = `card_id, box, due_on, reviews, lapses, date(timezone($1, created_at))`

func scanCard(row pgx.Row) (model.CardReview, error) {
	var c model.CardReview
	err := row.Scan(&c.CardID, &c.Box, &c.DueOn, &c.Reviews, &c.Lapses, &c.CreatedOn)
	return c, err
}

// CardReviews renvoie toutes les cartes suivies, la plus en retard d'abord. tz donne le jour local de création.
func (r *ProgressRepo) CardReviews(ctx context.Context, tz string) ([]model.CardReview, error) {
	rows, err := r.db.Query(ctx, `SELECT `+cardColumns+` FROM card_reviews WHERE user_id = $2
		ORDER BY due_on, last_reviewed_at, card_id`, tz, r.uid)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (model.CardReview, error) { return scanCard(row) })
}

// CardReview verrouille et renvoie l'état d'une carte ; ok = false si elle n'a jamais été révisée.
func (r *ProgressRepo) CardReview(ctx context.Context, cardID string) (c model.CardReview, ok bool, err error) {
	c, err = scanCard(r.db.QueryRow(ctx, `SELECT `+cardColumns+` FROM card_reviews
		WHERE user_id = $2 AND card_id = $3 FOR UPDATE`, "UTC", r.uid, cardID))
	if errors.Is(err, pgx.ErrNoRows) {
		return model.CardReview{CardID: cardID}, false, nil
	}
	return c, err == nil, err
}

func (r *ProgressRepo) SaveCardReview(ctx context.Context, c model.CardReview) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO card_reviews (user_id, card_id, box, due_on, reviews, lapses) VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (user_id, card_id) DO UPDATE SET box = EXCLUDED.box, due_on = EXCLUDED.due_on,
			reviews = EXCLUDED.reviews, lapses = EXCLUDED.lapses, last_reviewed_at = now()`,
		r.uid, c.CardID, c.Box, c.DueOn, c.Reviews, c.Lapses)
	return err
}

// --- Traces pour « aujourd'hui » ----------------------------------------------

// LessonCompletions : leçon terminée → jour local de la fin.
func (r *ProgressRepo) LessonCompletions(ctx context.Context, tz string) (map[string]time.Time, error) {
	rows, err := r.db.Query(ctx, `SELECT lesson_id, date(timezone($1, completed_at)) FROM lesson_progress WHERE user_id = $2`, tz, r.uid)
	if err != nil {
		return nil, err
	}
	out := map[string]time.Time{}
	var id string
	var day time.Time
	_, err = pgx.ForEachRow(rows, []any{&id, &day}, func() error {
		out[id] = day
		return nil
	})
	return out, err
}

// RecentTouches renvoie les dernières traces d'activité (XP et brouillons d'exercice), la plus récente d'abord.
func (r *ProgressRepo) RecentTouches(ctx context.Context, limit int) ([]model.Touch, error) {
	rows, err := r.db.Query(ctx, `
		(SELECT kind, ref_id, created_at FROM xp_events WHERE user_id = $1)
		UNION ALL (SELECT 'draft', exercise_id, updated_at FROM exercise_progress WHERE user_id = $1)
		ORDER BY 3 DESC LIMIT $2`, r.uid, limit)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (model.Touch, error) {
		var t model.Touch
		err := row.Scan(&t.Kind, &t.RefID, &t.At)
		return t, err
	})
}

// EnqueueMistake place une question ratée dans la révision : boîte 1, à revoir demain. Déjà suivie, elle
// repart de la boîte 1 (une nouvelle erreur efface les progrès).
func (r *ProgressRepo) EnqueueMistake(ctx context.Context, cardID string) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO card_reviews (user_id, card_id, box, due_on) VALUES ($1, $2, 1, CURRENT_DATE + 1)
		ON CONFLICT (user_id, card_id) DO UPDATE SET box = 1, due_on = LEAST(card_reviews.due_on, CURRENT_DATE + 1)`,
		r.uid, cardID)
	return err
}
