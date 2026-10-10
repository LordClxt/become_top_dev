package repository

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"

	"btd/backend/internal/model"
)

const profileID = 1 // un seul utilisateur : une seule ligne

type ProfileRepo struct {
	db DBTX
}

// Get renvoie le profil, ou nil s'il n'a jamais été enregistré.
func (r *ProfileRepo) Get(ctx context.Context) (*model.Profile, error) {
	var p model.Profile
	var ctype *string
	err := r.db.QueryRow(ctx, `SELECT avatar, avatar_type, avatar_updated_at FROM profile WHERE id = $1`, profileID).
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
		INSERT INTO profile (id, avatar, avatar_type, avatar_updated_at)
		VALUES ($1, $2, $3, CASE WHEN $4 THEN now() END)
		ON CONFLICT (id) DO UPDATE SET avatar = EXCLUDED.avatar, avatar_type = EXCLUDED.avatar_type,
			avatar_updated_at = EXCLUDED.avatar_updated_at`,
		profileID, data, ctype, data != nil)
	return err
}
