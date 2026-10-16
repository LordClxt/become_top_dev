package service

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"math/big"
	"net/mail"
	"strings"
	"time"
	"unicode"
	"unicode/utf8"

	"btd/backend/internal/model"
	"btd/backend/internal/repository"
)

const (
	SessionTTL     = 30 * 24 * time.Hour
	InviteTTL      = 7 * 24 * time.Hour
	MinPasswordLen = 10
	maxPasswordLen = 128 // en octets : borne le coût du hash
	maxNameLen     = 40
	inviteLen      = 12
	// inviteAlphabet évite les caractères qu'on confond à la lecture (0/O, 1/I/L).
	inviteAlphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
)

type UserView struct {
	ID          int64  `json:"id"`
	Email       string `json:"email"`
	DisplayName string `json:"display_name"`
	IsAdmin     bool   `json:"is_admin"`
}

func userView(u *model.User) *UserView {
	return &UserView{ID: u.ID, Email: u.Email, DisplayName: u.DisplayName, IsAdmin: u.IsAdmin}
}

// --- Validation --------------------------------------------------------------

func normalizeEmail(email string) string { return strings.ToLower(strings.TrimSpace(email)) }

func validateEmail(email string) error {
	addr, err := mail.ParseAddress(email)
	if err != nil || addr.Address != email || len(email) > 254 {
		return errorf(Invalid, "adresse email invalide")
	}
	return nil
}

func validatePassword(password string) error {
	if utf8.RuneCountInString(password) < MinPasswordLen {
		return errorf(Invalid, "mot de passe trop court (%d caractères minimum)", MinPasswordLen)
	}
	if len(password) > maxPasswordLen {
		return errorf(Invalid, "mot de passe trop long (%d octets maximum)", maxPasswordLen)
	}
	return nil
}

func normalizeName(name string) (string, error) {
	name = strings.Join(strings.Fields(name), " ")
	n := utf8.RuneCountInString(name)
	if n == 0 || n > maxNameLen || strings.IndexFunc(name, unicode.IsControl) >= 0 {
		return "", errorf(Invalid, "nom affiché : 1 à %d caractères", maxNameLen)
	}
	return name, nil
}

// NormalizeInviteCode accepte le code tel qu'on le recopie : minuscules, tirets, espaces.
func NormalizeInviteCode(code string) string {
	return strings.Map(func(r rune) rune {
		if r == '-' || unicode.IsSpace(r) {
			return -1
		}
		return unicode.ToUpper(r)
	}, code)
}

// --- Sessions ----------------------------------------------------------------

// newSession crée une session et renvoie son jeton (32 octets aléatoires) ; seul son SHA-256 est stocké.
func (s *Service) newSession(ctx context.Context, users *repository.UserRepo, userID int64) (string, error) {
	raw := make([]byte, 32)
	_, _ = rand.Read(raw)
	token := base64.RawURLEncoding.EncodeToString(raw)
	if err := users.CreateSession(ctx, hashToken(token), userID, s.now().Add(SessionTTL)); err != nil {
		return "", err
	}
	return token, nil
}

func hashToken(token string) []byte {
	sum := sha256.Sum256([]byte(token))
	return sum[:]
}

// SessionUser renvoie le compte de la session et la prolonge ; nil si elle est inconnue ou expirée.
func (s *Service) SessionUser(ctx context.Context, token string) (*UserView, error) {
	if token == "" {
		return nil, nil
	}
	u, err := s.repos().Users.SessionUser(ctx, hashToken(token), s.now().Add(SessionTTL))
	if err != nil || u == nil {
		return nil, err
	}
	return userView(u), nil
}

func (s *Service) Logout(ctx context.Context, token string) error {
	if token == "" {
		return nil
	}
	return s.repos().Users.DeleteSession(ctx, hashToken(token))
}

// Login vérifie email et mot de passe et ouvre une session.
func (s *Service) Login(ctx context.Context, email, password string) (string, *UserView, error) {
	users := s.repos().Users
	u, err := users.ByEmail(ctx, normalizeEmail(email))
	if err != nil {
		return "", nil, err
	}
	hash := dummyHash
	if u != nil && u.PasswordHash != "" {
		hash = u.PasswordHash
	}
	if !CheckPassword(hash, password) || u == nil || u.PasswordHash == "" {
		return "", nil, errorf(Unauthorized, "email ou mot de passe incorrect")
	}
	if err := users.DeleteExpiredSessions(ctx); err != nil {
		return "", nil, err
	}
	token, err := s.newSession(ctx, users, u.ID)
	if err != nil {
		return "", nil, err
	}
	return token, userView(u), nil
}

type SignupInput struct {
	Code        string
	Email       string
	DisplayName string
	Password    string
}

// Signup crée un compte et ouvre une session.
func (s *Service) Signup(ctx context.Context, in SignupInput) (string, *UserView, error) {
	email := normalizeEmail(in.Email)
	if err := validateEmail(email); err != nil {
		return "", nil, err
	}
	name, err := normalizeName(in.DisplayName)
	if err != nil {
		return "", nil, err
	}
	if err := validatePassword(in.Password); err != nil {
		return "", nil, err
	}
	hash := HashPassword(in.Password) // avant la transaction : ~30 ms de calcul
	var token string
	var user *model.User
	err = s.store.InTx(ctx, func(r repository.Repos) error {
		if user, err = r.Users.Create(ctx, email, name, hash); err != nil {
			if errors.Is(err, repository.ErrEmailTaken) {
				return errorf(Conflict, "un compte existe déjà avec cet email")
			}
			return err
		}
		token, err = s.newSession(ctx, r.Users, user.ID)
		return err
	})
	if err != nil {
		return "", nil, err
	}
	return token, userView(user), nil
}

// ChangePassword vérifie le mot de passe actuel, pose le nouveau et ferme les autres sessions.
func (s *Service) ChangePassword(ctx context.Context, uid int64, token, current, next string) error {
	users := s.repos().Users
	u, err := users.ByID(ctx, uid)
	if err != nil {
		return err
	}
	if u == nil || !CheckPassword(u.PasswordHash, current) {
		return errorf(Invalid, "mot de passe actuel incorrect")
	}
	if err := validatePassword(next); err != nil {
		return err
	}
	if err := users.SetPassword(ctx, uid, HashPassword(next)); err != nil {
		return err
	}
	return users.DeleteOtherSessions(ctx, uid, hashToken(token))
}

// EnsureOwner pose l'email et le mot de passe du propriétaire au premier démarrage.
// Ensuite, ces variables sont ignorées : le mot de passe se change dans l'app ou avec btd reset-password.
func (s *Service) EnsureOwner(ctx context.Context, email, password string) (bool, error) {
	email = normalizeEmail(email)
	if err := validateEmail(email); err != nil {
		return false, err
	}
	if password == "" {
		return false, errorf(Invalid, "mot de passe du propriétaire vide")
	}
	return s.repos().Users.ClaimOwner(ctx, email, HashPassword(password))
}

// ResetPassword remplace le mot de passe d'un compte et ferme toutes ses sessions (commande d'admin).
func (s *Service) ResetPassword(ctx context.Context, email, password string) error {
	if err := validatePassword(password); err != nil {
		return err
	}
	return s.store.InTx(ctx, func(r repository.Repos) error {
		u, err := r.Users.ByEmail(ctx, normalizeEmail(email))
		if err != nil {
			return err
		}
		if u == nil {
			return errorf(NotFound, "aucun compte avec cet email")
		}
		if err := r.Users.SetPassword(ctx, u.ID, HashPassword(password)); err != nil {
			return err
		}
		return r.Users.DeleteOtherSessions(ctx, u.ID, nil)
	})
}

// --- Administration ----------------------------------------------------------

type InviteView struct {
	Code      string  `json:"code"`
	CreatedAt string  `json:"created_at"`
	ExpiresAt string  `json:"expires_at"`
	Status    string  `json:"status"` // pending, used, expired
	UsedBy    *string `json:"used_by"`
	UsedAt    *string `json:"used_at"`
}

func (s *Service) inviteView(inv model.Invite) InviteView {
	v := InviteView{
		Code: inv.Code, CreatedAt: pyISO(inv.CreatedAt), ExpiresAt: pyISO(inv.ExpiresAt), Status: "pending",
		UsedBy: inv.UsedBy,
	}
	switch {
	case inv.UsedAt != nil:
		v.Status = "used"
		v.UsedAt = new(pyISO(*inv.UsedAt))
	case !inv.ExpiresAt.After(s.now()):
		v.Status = "expired"
	}
	return v
}

func newInviteCode() string {
	b := make([]byte, inviteLen)
	for i := range b {
		n, _ := rand.Int(rand.Reader, big.NewInt(int64(len(inviteAlphabet)))) // tirage uniforme
		b[i] = inviteAlphabet[n.Int64()]
	}
	return string(b)
}

func (s *Service) CreateInvite(ctx context.Context, adminID int64) (*InviteView, error) {
	inv, err := s.repos().Users.CreateInvite(ctx, newInviteCode(), adminID, s.now().Add(InviteTTL))
	if err != nil {
		return nil, err
	}
	return new(s.inviteView(*inv)), nil
}

func (s *Service) Invites(ctx context.Context) ([]InviteView, error) {
	list, err := s.repos().Users.Invites(ctx)
	out := make([]InviteView, 0, len(list))
	for _, inv := range list {
		out = append(out, s.inviteView(inv))
	}
	return out, err
}

func (s *Service) RevokeInvite(ctx context.Context, code string) error {
	ok, err := s.repos().Users.DeleteInvite(ctx, NormalizeInviteCode(code))
	if err == nil && !ok {
		return errorf(NotFound, "invitation introuvable ou déjà utilisée")
	}
	return err
}

type MemberView struct {
	ID          int64  `json:"id"`
	Email       string `json:"email"`
	DisplayName string `json:"display_name"`
	IsAdmin     bool   `json:"is_admin"`
	CreatedAt   string `json:"created_at"`
	XP          int    `json:"xp"`
}

func (s *Service) Members(ctx context.Context) ([]MemberView, error) {
	list, err := s.repos().Users.Members(ctx)
	out := make([]MemberView, 0, len(list))
	for _, m := range list {
		out = append(out, MemberView{
			ID: m.ID, Email: m.Email, DisplayName: m.DisplayName, IsAdmin: m.IsAdmin,
			CreatedAt: pyISO(m.CreatedAt), XP: m.XP,
		})
	}
	return out, err
}
