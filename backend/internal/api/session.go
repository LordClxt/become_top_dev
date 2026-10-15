package api

import (
	"context"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"

	"btd/backend/internal/service"
)

// Session : le cookie porte un jeton aléatoire opaque ; la session vit en base (service.SessionUser),
// ce qui permet de la révoquer. Glissante : renouvelée à chaque requête authentifiée.

const sessionCookie = "btd_session"

type cookies struct {
	secure bool
}

func (c cookies) token(r *http.Request) string {
	if ck, err := r.Cookie(sessionCookie); err == nil {
		return ck.Value
	}
	return ""
}

func (c cookies) set(w http.ResponseWriter, token string) {
	http.SetCookie(w, &http.Cookie{
		Name: sessionCookie, Value: token, Path: "/", MaxAge: int(service.SessionTTL.Seconds()),
		HttpOnly: true, Secure: c.secure, SameSite: http.SameSiteLaxMode,
	})
}

func (c cookies) clear(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name: sessionCookie, Value: "", Path: "/", MaxAge: -1,
		HttpOnly: true, Secure: c.secure, SameSite: http.SameSiteLaxMode,
	})
}

// --- Utilisateur courant -----------------------------------------------------

type userKey struct{}

// currentUser est posé par requireAuth : jamais nil dans un handler protégé.
func currentUser(r *http.Request) *service.UserView {
	return r.Context().Value(userKey{}).(*service.UserView)
}

func withUser(r *http.Request, u *service.UserView) *http.Request {
	return r.WithContext(context.WithValue(r.Context(), userKey{}, u))
}

// --- Limite de débit ---------------------------------------------------------

// limiter compte les tentatives par clé (IP) sur une fenêtre fixe. En mémoire : une seule instance du backend.
type limiter struct {
	mu     sync.Mutex
	max    int
	window time.Duration
	now    func() time.Time
	hits   map[string]*window
}

type window struct {
	start time.Time
	count int
}

func newLimiter(max int, per time.Duration) *limiter {
	return &limiter{max: max, window: per, now: time.Now, hits: map[string]*window{}}
}

// allow compte une tentative ; false quand la limite de la fenêtre est atteinte.
func (l *limiter) allow(key string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	now := l.now()
	if len(l.hits) > 10_000 { // borne la mémoire : on oublie les fenêtres terminées
		for k, w := range l.hits {
			if now.Sub(w.start) >= l.window {
				delete(l.hits, k)
			}
		}
	}
	w := l.hits[key]
	if w == nil || now.Sub(w.start) >= l.window {
		w = &window{start: now}
		l.hits[key] = w
	}
	w.count++
	return w.count <= l.max
}

// clientIP : derrière le proxy Caddy, X-Real-IP porte l'adresse du client (Caddy l'écrase, le client
// ne peut pas la choisir). Sans proxy (dev), l'adresse de la connexion.
func clientIP(r *http.Request) string {
	if ip := strings.TrimSpace(r.Header.Get("X-Real-IP")); ip != "" {
		return ip
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}
