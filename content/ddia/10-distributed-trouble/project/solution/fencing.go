package lab

import (
	"errors"
	"math"
	"sync"
	"time"
)

// Clock renvoie une lecture d'horloge monotone : une durée depuis un instant arbitraire.
// Seules les différences entre deux lectures ont un sens.
type Clock interface {
	Now() time.Duration
}

// ManualClock est une horloge de test qu'on avance à la main : aucun time.Sleep.
type ManualClock struct {
	mu sync.Mutex
	t  time.Duration
}

func (c *ManualClock) Now() time.Duration {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.t
}

func (c *ManualClock) Advance(d time.Duration) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.t += d
}

var (
	ErrLeaseHeld    = errors.New("bail détenu par un autre client")
	ErrNotHolder    = errors.New("pas détenteur du bail courant")
	ErrStaleToken   = errors.New("jeton de clôture périmé")
	ErrMissingToken = errors.New("écriture sans jeton de clôture")
)

// ---------- Jalon 1 : le détecteur de pannes adaptatif ----------

type history struct {
	last      time.Duration
	intervals []time.Duration
}

// Detector soupçonne un nœud quand son silence dépasse un timeout calculé à partir de l'historique de ses battements.
// Il n'est pas utilisé de façon concurrente.
type Detector struct {
	clock      Clock
	window     int
	k          float64
	minTimeout time.Duration
	nodes      map[string]*history
}

func NewDetector(clock Clock, window int, k float64, minTimeout time.Duration) *Detector {
	if window < 1 {
		window = 1
	}
	return &Detector{clock: clock, window: window, k: k, minTimeout: minTimeout, nodes: map[string]*history{}}
}

// Heartbeat enregistre un battement de node à l'instant courant.
func (d *Detector) Heartbeat(node string) {
	now := d.clock.Now()
	h, ok := d.nodes[node]
	if !ok {
		d.nodes[node] = &history{last: now}
		return
	}
	h.intervals = append(h.intervals, now-h.last)
	if len(h.intervals) > d.window {
		h.intervals = h.intervals[len(h.intervals)-d.window:]
	}
	h.last = now
}

// Timeout vaut moyenne + k × écart-type des derniers intervalles, jamais moins que minTimeout.
func (d *Detector) Timeout(node string) time.Duration {
	h, ok := d.nodes[node]
	if !ok || len(h.intervals) == 0 {
		return d.minTimeout
	}
	var sum float64
	for _, iv := range h.intervals {
		sum += float64(iv)
	}
	n := float64(len(h.intervals))
	mean := sum / n
	var sq float64
	for _, iv := range h.intervals {
		sq += (float64(iv) - mean) * (float64(iv) - mean)
	}
	t := time.Duration(math.Round(mean + d.k*math.Sqrt(sq/n)))
	return max(t, d.minTimeout)
}

// Suspected dit si le silence de node dépasse strictement son timeout. Un nœud jamais entendu est suspect.
func (d *Detector) Suspected(node string) bool {
	h, ok := d.nodes[node]
	if !ok {
		return true
	}
	return d.clock.Now()-h.last > d.Timeout(node)
}

// ---------- Jalon 2 : le service de baux ----------

// Lease est un bail : un détenteur, un jeton de clôture, une échéance (lue sur l'horloge du service).
type Lease struct {
	Holder  string
	Token   uint64
	Expires time.Duration
}

// LeaseService accorde un bail à la fois, avec un jeton strictement croissant à chaque nouvelle attribution.
type LeaseService struct {
	mu        sync.Mutex
	clock     Clock
	ttl       time.Duration
	current   Lease
	lastToken uint64
}

func NewLeaseService(clock Clock, ttl time.Duration) *LeaseService {
	return &LeaseService{clock: clock, ttl: ttl}
}

func (s *LeaseService) valid(now time.Duration) bool {
	return s.current.Holder != "" && now < s.current.Expires
}

// Acquire accorde un nouveau bail (nouveau jeton) si aucun bail valide n'est détenu par un autre client.
// Le détenteur d'un bail encore valide récupère son bail inchangé.
func (s *LeaseService) Acquire(client string) (Lease, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := s.clock.Now()
	if s.valid(now) {
		if s.current.Holder == client {
			return s.current, nil
		}
		return Lease{}, ErrLeaseHeld
	}
	s.lastToken++
	s.current = Lease{Holder: client, Token: s.lastToken, Expires: now + s.ttl}
	return s.current, nil
}

// Renew prolonge le bail courant, sans changer de jeton, si client le détient encore avec ce jeton.
func (s *LeaseService) Renew(client string, token uint64) (Lease, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := s.clock.Now()
	if !s.valid(now) || s.current.Holder != client || s.current.Token != token {
		return Lease{}, ErrNotHolder
	}
	s.current.Expires = now + s.ttl
	return s.current, nil
}

// ---------- Jalon 3 : le stockage qui vérifie les jetons ----------

type entry struct {
	value string
	token uint64
}

// Store rejette toute écriture dont le jeton est plus petit que le plus grand jeton déjà vu pour la clé.
type Store struct {
	mu   sync.Mutex
	data map[string]entry
}

func NewStore() *Store {
	return &Store{data: map[string]entry{}}
}

func (s *Store) Write(key, value string, token uint64) error {
	if token == 0 {
		return ErrMissingToken
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if cur, ok := s.data[key]; ok && token < cur.token {
		return ErrStaleToken
	}
	s.data[key] = entry{value: value, token: token}
	return nil
}

func (s *Store) Get(key string) (string, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	e, ok := s.data[key]
	return e.value, ok
}

// HighestToken renvoie le plus grand jeton accepté pour key (0 si aucun).
func (s *Store) HighestToken(key string) uint64 {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.data[key].token
}
