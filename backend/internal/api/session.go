package api

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"strings"
	"time"
)

// Session : cookie signé HMAC-SHA256, sans état côté serveur (un seul utilisateur).
// Format : base64(payload JSON) "." base64(signature). Glissante : renouvelée à chaque requête authentifiée.

const (
	sessionCookie = "btd_session"
	sessionMaxAge = 30 * 24 * time.Hour
)

type sessionPayload struct {
	Auth     bool  `json:"auth"`
	IssuedAt int64 `json:"iat"`
}

type sessions struct {
	secret []byte
	secure bool
	now    func() time.Time
}

func (s sessions) sign(data string) string {
	mac := hmac.New(sha256.New, s.secret)
	mac.Write([]byte(data))
	return base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}

// authenticated vérifie la signature et l'âge du cookie.
func (s sessions) authenticated(r *http.Request) bool {
	c, err := r.Cookie(sessionCookie)
	if err != nil {
		return false
	}
	data, sig, ok := strings.Cut(c.Value, ".")
	if !ok || !hmac.Equal([]byte(sig), []byte(s.sign(data))) {
		return false
	}
	raw, err := base64.RawURLEncoding.DecodeString(data)
	if err != nil {
		return false
	}
	var p sessionPayload
	if json.Unmarshal(raw, &p) != nil {
		return false
	}
	age := s.now().Sub(time.Unix(p.IssuedAt, 0))
	return p.Auth && age >= -time.Minute && age < sessionMaxAge
}

func (s sessions) issue(w http.ResponseWriter) {
	raw, _ := json.Marshal(sessionPayload{Auth: true, IssuedAt: s.now().Unix()})
	data := base64.RawURLEncoding.EncodeToString(raw)
	http.SetCookie(w, &http.Cookie{
		Name: sessionCookie, Value: data + "." + s.sign(data), Path: "/", MaxAge: int(sessionMaxAge.Seconds()),
		HttpOnly: true, Secure: s.secure, SameSite: http.SameSiteLaxMode,
	})
}

func (s sessions) clear(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name: sessionCookie, Value: "", Path: "/", MaxAge: -1,
		HttpOnly: true, Secure: s.secure, SameSite: http.SameSiteLaxMode,
	})
}
