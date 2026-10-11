package lab

import (
	"errors"
	"sync"
	"time"
)

// Clock renvoie une lecture d'horloge monotone : une durée depuis un instant arbitraire.
// Seules les différences entre deux lectures ont un sens. (fourni)
type Clock interface {
	Now() time.Duration
}

// ManualClock est une horloge de test qu'on avance à la main : aucun time.Sleep. (fourni)
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

// Erreurs à renvoyer. (fournies)
var (
	ErrLeaseHeld    = errors.New("bail détenu par un autre client")
	ErrNotHolder    = errors.New("pas détenteur du bail courant")
	ErrStaleToken   = errors.New("jeton de clôture périmé")
	ErrMissingToken = errors.New("écriture sans jeton de clôture")
)

var errTODO = errors.New("à implémenter")

// ---------- Jalon 1 : le détecteur de pannes adaptatif ----------

// history garde, pour un nœud, l'instant du dernier battement et les derniers intervalles. (fourni)
type history struct {
	last      time.Duration
	intervals []time.Duration
}

// Detector soupçonne un nœud quand son silence dépasse un timeout calculé à partir de l'historique de ses battements.
// Il n'est pas utilisé de façon concurrente. (fourni)
type Detector struct {
	clock      Clock
	window     int
	k          float64
	minTimeout time.Duration
	nodes      map[string]*history
}

// NewDetector crée un détecteur qui garde au plus window intervalles par nœud. (fourni)
func NewDetector(clock Clock, window int, k float64, minTimeout time.Duration) *Detector {
	if window < 1 {
		window = 1
	}
	return &Detector{clock: clock, window: window, k: k, minTimeout: minTimeout, nodes: map[string]*history{}}
}

// Heartbeat enregistre un battement de node à l'instant courant : le premier fixe seulement l'instant de référence,
// les suivants ajoutent l'intervalle depuis le précédent. On ne garde que les window derniers intervalles.
func (d *Detector) Heartbeat(node string) {
	// TODO
}

// Timeout vaut moyenne + k × écart-type (de population) des intervalles gardés, arrondi à la nanoseconde,
// jamais moins que minTimeout. Sans aucun intervalle : minTimeout.
func (d *Detector) Timeout(node string) time.Duration {
	// TODO
	return 0
}

// Suspected dit si le silence de node (maintenant − dernier battement) dépasse STRICTEMENT son timeout.
// Un nœud jamais entendu est suspect.
func (d *Detector) Suspected(node string) bool {
	// TODO
	return false
}

// ---------- Jalon 2 : le service de baux ----------

// Lease est un bail : un détenteur, un jeton de clôture, une échéance (lue sur l'horloge du service). (fourni)
type Lease struct {
	Holder  string
	Token   uint64
	Expires time.Duration
}

// LeaseService accorde un bail à la fois, avec un jeton strictement croissant à chaque nouvelle attribution. (fourni)
type LeaseService struct {
	mu        sync.Mutex
	clock     Clock
	ttl       time.Duration
	current   Lease
	lastToken uint64
}

// NewLeaseService crée un service dont les baux durent ttl. (fourni)
func NewLeaseService(clock Clock, ttl time.Duration) *LeaseService {
	return &LeaseService{clock: clock, ttl: ttl}
}

// Acquire accorde un nouveau bail (jeton = précédent + 1, en commençant à 1 ; échéance = maintenant + ttl) si aucun bail
// valide (maintenant < échéance) n'est détenu par un autre client, sinon ErrLeaseHeld.
// Le détenteur d'un bail encore valide récupère son bail inchangé. Doit être sûr en concurrence.
func (s *LeaseService) Acquire(client string) (Lease, error) {
	// TODO
	return Lease{}, errTODO
}

// Renew prolonge le bail courant (échéance = maintenant + ttl), sans changer de jeton, si client le détient encore,
// avec ce jeton, et qu'il n'a pas expiré. Sinon ErrNotHolder : un bail expiré ne se renouvelle pas, il se redemande.
func (s *LeaseService) Renew(client string, token uint64) (Lease, error) {
	// TODO
	return Lease{}, errTODO
}

// ---------- Jalon 3 : le stockage qui vérifie les jetons ----------

// Store rejette toute écriture dont le jeton est plus petit que le plus grand jeton déjà accepté pour la clé.
type Store struct {
	mu sync.Mutex
	// TODO : ajoute ce qu'il faut pour retenir, par clé, la valeur et le plus grand jeton accepté.
}

func NewStore() *Store {
	// TODO
	return &Store{}
}

// Write écrit value sous key. Jeton 0 : ErrMissingToken. Jeton plus petit que le plus grand accepté pour key :
// ErrStaleToken (et rien ne change). Un jeton égal ou plus grand est accepté.
func (s *Store) Write(key, value string, token uint64) error {
	// TODO
	return errTODO
}

// Get renvoie la valeur de key et si elle existe.
func (s *Store) Get(key string) (string, bool) {
	// TODO
	return "", false
}

// HighestToken renvoie le plus grand jeton accepté pour key (0 si aucun).
func (s *Store) HighestToken(key string) uint64 {
	// TODO
	return 0
}
