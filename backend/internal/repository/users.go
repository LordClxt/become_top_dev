package repository

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"

	"btd/backend/internal/model"
)

// ErrEmailTaken : un compte existe déjà avec cet email.
var ErrEmailTaken = errors.New("email déjà utilisé")

// OwnerID est le compte créé par la migration 00002 : il porte la progression d'avant les comptes.
const OwnerID = 1

// UserRepo gère les comptes, les sessions et les invitations (pas l'état d'apprentissage).
type UserRepo struct {
	db DBTX
}

const userColumns = `id, email, display_name, password_hash, is_admin, created_at`

func scanUser(row pgx.Row) (*model.User, error) {
	var u model.User
	err := row.Scan(&u.ID, &u.Email, &u.DisplayName, &u.PasswordHash, &u.IsAdmin, &u.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &u, nil
}

// --- Comptes -----------------------------------------------------------------

// Create crée un compte ; email doit déjà être en minuscules.
func (r *UserRepo) Create(ctx context.Context, email, displayName, passwordHash string) (*model.User, error) {
	u, err := scanUser(r.db.QueryRow(ctx, `
		INSERT INTO users (email, display_name, password_hash) VALUES ($1, $2, $3)
		RETURNING `+userColumns, email, displayName, passwordHash))
	if pgErr := (*pgconn.PgError)(nil); errors.As(err, &pgErr) && pgErr.Code == "23505" {
		return nil, ErrEmailTaken
	}
	return u, err
}

// ByEmail renvoie le compte, ou nil s'il n'existe pas.
func (r *UserRepo) ByEmail(ctx context.Context, email string) (*model.User, error) {
	return scanUser(r.db.QueryRow(ctx, `SELECT `+userColumns+` FROM users WHERE email = $1 AND email <> ''`, email))
}

func (r *UserRepo) ByID(ctx context.Context, id int64) (*model.User, error) {
	return scanUser(r.db.QueryRow(ctx, `SELECT `+userColumns+` FROM users WHERE id = $1`, id))
}

func (r *UserRepo) SetPassword(ctx context.Context, id int64, passwordHash string) error {
	_, err := r.db.Exec(ctx, `UPDATE users SET password_hash = $2 WHERE id = $1`, id, passwordHash)
	return err
}

// ClaimOwner pose l'email et le mot de passe du propriétaire s'il n'a pas encore été réclamé.
func (r *UserRepo) ClaimOwner(ctx context.Context, email, passwordHash string) (bool, error) {
	tag, err := r.db.Exec(ctx, `
		UPDATE users SET email = $2, password_hash = $3 WHERE id = $1 AND password_hash = ''`,
		OwnerID, email, passwordHash)
	if pgErr := (*pgconn.PgError)(nil); errors.As(err, &pgErr) && pgErr.Code == "23505" {
		return false, ErrEmailTaken
	}
	return tag.RowsAffected() == 1, err
}

// Members liste les comptes réclamés avec leur XP, du plus ancien au plus récent.
func (r *UserRepo) Members(ctx context.Context) ([]model.Member, error) {
	rows, err := r.db.Query(ctx, `
		SELECT u.id, u.email, u.display_name, u.is_admin, u.created_at,
			COALESCE((SELECT SUM(amount) FROM xp_events x WHERE x.user_id = u.id), 0)
		FROM users u WHERE u.password_hash <> '' ORDER BY u.id`)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (model.Member, error) {
		var m model.Member
		err := row.Scan(&m.ID, &m.Email, &m.DisplayName, &m.IsAdmin, &m.CreatedAt, &m.XP)
		return m, err
	})
}

// --- Sessions ----------------------------------------------------------------

func (r *UserRepo) CreateSession(ctx context.Context, tokenHash []byte, userID int64, expiresAt time.Time) error {
	_, err := r.db.Exec(ctx, `INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)`,
		tokenHash, userID, expiresAt)
	return err
}

// SessionUser renvoie le compte d'une session valide et la prolonge jusqu'à expiresAt (session glissante).
// nil : session inconnue ou expirée.
func (r *UserRepo) SessionUser(ctx context.Context, tokenHash []byte, expiresAt time.Time) (*model.User, error) {
	return scanUser(r.db.QueryRow(ctx, `
		WITH s AS (
			UPDATE sessions SET expires_at = $2 WHERE token_hash = $1 AND expires_at > now() RETURNING user_id
		)
		SELECT `+userColumns+` FROM users WHERE id = (SELECT user_id FROM s)`, tokenHash, expiresAt))
}

func (r *UserRepo) DeleteSession(ctx context.Context, tokenHash []byte) error {
	_, err := r.db.Exec(ctx, `DELETE FROM sessions WHERE token_hash = $1`, tokenHash)
	return err
}

// DeleteOtherSessions ferme toutes les sessions du compte sauf keep (nil : toutes).
func (r *UserRepo) DeleteOtherSessions(ctx context.Context, userID int64, keep []byte) error {
	_, err := r.db.Exec(ctx, `DELETE FROM sessions WHERE user_id = $1 AND token_hash IS DISTINCT FROM $2`, userID, keep)
	return err
}

func (r *UserRepo) DeleteExpiredSessions(ctx context.Context) error {
	_, err := r.db.Exec(ctx, `DELETE FROM sessions WHERE expires_at <= now()`)
	return err
}

// --- Invitations -------------------------------------------------------------

func (r *UserRepo) CreateInvite(ctx context.Context, code string, createdBy int64, expiresAt time.Time) (*model.Invite, error) {
	inv := model.Invite{Code: code}
	err := r.db.QueryRow(ctx, `
		INSERT INTO invites (code, created_by, expires_at) VALUES ($1, $2, $3) RETURNING created_at, expires_at`,
		code, createdBy, expiresAt).Scan(&inv.CreatedAt, &inv.ExpiresAt)
	return &inv, err
}

// Invites liste les 100 dernières invitations, les plus récentes d'abord.
func (r *UserRepo) Invites(ctx context.Context) ([]model.Invite, error) {
	rows, err := r.db.Query(ctx, `
		SELECT i.code, i.created_at, i.expires_at, u.display_name, i.used_at
		FROM invites i LEFT JOIN users u ON u.id = i.used_by
		ORDER BY i.created_at DESC LIMIT 100`)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (model.Invite, error) {
		var inv model.Invite
		err := row.Scan(&inv.Code, &inv.CreatedAt, &inv.ExpiresAt, &inv.UsedBy, &inv.UsedAt)
		return inv, err
	})
}

// DeleteInvite révoque une invitation pas encore utilisée.
func (r *UserRepo) DeleteInvite(ctx context.Context, code string) (bool, error) {
	tag, err := r.db.Exec(ctx, `DELETE FROM invites WHERE code = $1 AND used_at IS NULL`, code)
	return tag.RowsAffected() == 1, err
}

// ConsumeInvite marque l'invitation comme utilisée si elle est encore valide. À appeler dans la
// transaction qui crée le compte : si la création échoue, l'invitation reste disponible.
func (r *UserRepo) ConsumeInvite(ctx context.Context, code string) (bool, error) {
	tag, err := r.db.Exec(ctx, `
		UPDATE invites SET used_at = now() WHERE code = $1 AND used_at IS NULL AND expires_at > now()`, code)
	return tag.RowsAffected() == 1, err
}

func (r *UserRepo) SetInviteUser(ctx context.Context, code string, userID int64) error {
	_, err := r.db.Exec(ctx, `UPDATE invites SET used_by = $2 WHERE code = $1`, code, userID)
	return err
}
