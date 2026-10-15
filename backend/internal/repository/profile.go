package repository

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"

	"btd/backend/internal/model"
)

// ProfileRepo lit et écrit le profil d'un seul utilisateur (uid).
type ProfileRepo struct {
	db  DBTX
	uid int64
}

// Get renvoie le profil, ou nil s'il n'a jamais été enregistré.
func (r *ProfileRepo) Get(ctx context.Context) (*model.Profile, error) {
	var p model.Profile
	var ctype *string
	err := r.db.QueryRow(ctx, `SELECT avatar, avatar_type, avatar_updated_at FROM profile WHERE user_id = $1`, r.uid).
		Scan(&p.Avatar, &ctype, &p.AvatarUpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if ctype != nil {
		p.AvatarType = *ctype
	}
	return &p, err
}

// SetAvatar enregistre l'avatar, ou l'efface quand data est nil.
func (r *ProfileRepo) SetAvatar(ctx context.Context, data []byte, contentType string) error {
	var ctype *string
	if data != nil {
		ctype = &contentType
	}
	_, err := r.db.Exec(ctx, `
		INSERT INTO profile (user_id, avatar, avatar_type, avatar_updated_at)
		VALUES ($1, $2, $3, CASE WHEN $4 THEN now() END)
		ON CONFLICT (user_id) DO UPDATE SET avatar = EXCLUDED.avatar, avatar_type = EXCLUDED.avatar_type,
			avatar_updated_at = EXCLUDED.avatar_updated_at`,
		r.uid, data, ctype, data != nil)
	return err
}
