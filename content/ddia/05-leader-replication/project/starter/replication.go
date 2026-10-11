package lab

import (
	"errors"
	"hash/fnv"
)

// Entry est un changement du log de réplication : sa position (LSN), l'époque du leader qui l'a écrit, et l'écriture. (fourni)
type Entry struct {
	LSN   uint64
	Epoch uint64
	Key   string
	Value string
}

// Snapshot est une image cohérente des données, associée à la position exacte du log qu'elle contient. (fourni)
type Snapshot struct {
	Data  map[string]string
	LSN   uint64
	Epoch uint64
}

// Erreurs à renvoyer. (fournies)
var (
	ErrGap            = errors.New("trou dans le log : une entrée manque")
	ErrStaleEpoch     = errors.New("entrée d'une époque périmée : elle vient d'un ancien leader")
	ErrSnapshotNeeded = errors.New("position antérieure au log conservé : il faut repartir d'un snapshot")
	ErrNoCandidate    = errors.New("aucun follower à promouvoir")
	ErrEpoch          = errors.New("la nouvelle époque doit dépasser toutes les époques connues")
)

// ---------- Jalon 1 : le log et le rattrapage ----------

// Leader reçoit les écritures et les ajoute à son log de réplication. (fourni)
type Leader struct {
	epoch uint64
	base  uint64 // LSN couvert par l'état initial ; le log commence à base+1
	log   []Entry
	data  map[string]string
}

// NewLeader crée un leader vide à l'époque donnée. (fourni)
func NewLeader(epoch uint64) *Leader {
	return &Leader{epoch: epoch, data: map[string]string{}}
}

// Epoch renvoie l'époque du leader. (fourni)
func (l *Leader) Epoch() uint64 { return l.epoch }

// Get lit une clé sur le leader. (fourni)
func (l *Leader) Get(key string) (string, bool) {
	v, ok := l.data[key]
	return v, ok
}

// LastLSN renvoie la position de la dernière entrée du log.
func (l *Leader) LastLSN() uint64 {
	// TODO: base + nombre d'entrées du log
	return 0
}

// Put applique l'écriture localement, l'ajoute au log et renvoie l'entrée créée (position suivante, époque du leader).
func (l *Leader) Put(key, value string) Entry {
	// TODO
	return Entry{}
}

// Since renvoie une COPIE des entrées de position strictement supérieure à lsn (slice vide non nil s'il n'y en a pas).
// lsn antérieur à base : ErrSnapshotNeeded.
func (l *Leader) Since(lsn uint64) ([]Entry, error) {
	// TODO
	return nil, errors.New("à implémenter")
}

// Snapshot renvoie une COPIE des données, la position qu'elles contiennent et l'époque du leader.
func (l *Leader) Snapshot() Snapshot {
	// TODO
	return Snapshot{}
}

// Follower applique, dans l'ordre, les entrées reçues du leader. (fourni)
type Follower struct {
	epoch   uint64 // plus haute époque de leader connue
	base    uint64 // position du snapshot de départ
	applied uint64 // dernière position appliquée
	log     []Entry
	data    map[string]string
}

// Epoch renvoie la plus haute époque connue du follower. (fourni)
func (f *Follower) Epoch() uint64 { return f.epoch }

// Get lit une clé sur le follower. (fourni)
func (f *Follower) Get(key string) (string, bool) {
	v, ok := f.data[key]
	return v, ok
}

// NewFollower crée un follower à partir d'un snapshot (en COPIANT ses données) : sa position et son époque sont
// celles du snapshot.
func NewFollower(s Snapshot) *Follower {
	// TODO
	return &Follower{data: map[string]string{}}
}

// Position renvoie la dernière position appliquée.
func (f *Follower) Position() uint64 {
	// TODO
	return 0
}

// Apply applique les entrées envoyées par un leader d'époque epoch, dans l'ordre, et s'arrête à la première erreur
// (les entrées précédentes restent appliquées). Leader d'une époque inférieure à celle connue : ErrStaleEpoch, rien
// n'est appliqué. Entrée déjà appliquée : ignorée. Position sautée : ErrGap.
func (f *Follower) Apply(epoch uint64, entries []Entry) error {
	// TODO
	return errors.New("à implémenter")
}

// CatchUp demande au leader tout ce qui suit sa position et l'applique.
func (f *Follower) CatchUp(l *Leader) error {
	// TODO
	return errors.New("à implémenter")
}

// ---------- Jalon 2 : le failover ----------

// Promote choisit le follower le plus avancé (à égalité, le premier), annonce la nouvelle époque à tous les
// followers, et renvoie un leader qui reprend une COPIE de ses données et de son log (même base).
// Aucun follower : ErrNoCandidate. epoch ≤ époque d'un follower : ErrEpoch.
func Promote(followers []*Follower, epoch uint64) (*Leader, int, error) {
	// TODO
	return nil, -1, errors.New("à implémenter")
}

// LostWrites renvoie les entrées de l'ancien leader que le nouveau n'a jamais reçues (position > promotedAt).
func LostWrites(old *Leader, promotedAt uint64) []Entry {
	// TODO
	return nil
}

// ---------- Jalon 3 : le routeur de lectures ----------

// ReplicaFor choisit le réplica d'un utilisateur par hachage FNV-1a de son identifiant. (fourni)
func ReplicaFor(user string, n int) int {
	h := fnv.New32a()
	h.Write([]byte(user))
	return int(h.Sum32() % uint32(n))
}

// Router envoie les écritures au leader et chaque utilisateur vers un réplica fixe, sauf si ce réplica n'a pas
// atteint la plus haute position que l'utilisateur a écrite ou lue. (fourni)
type Router struct {
	leader    *Leader
	followers []*Follower
	seen      map[string]uint64
}

// NewRouter crée un routeur. (fourni)
func NewRouter(l *Leader, followers []*Follower) *Router {
	return &Router{leader: l, followers: followers, seen: map[string]uint64{}}
}

// Seen renvoie la plus haute position écrite ou lue par l'utilisateur. (fourni)
func (r *Router) Seen(user string) uint64 { return r.seen[user] }

// Write écrit au leader et retient la position de l'écriture pour l'utilisateur.
func (r *Router) Write(user, key, value string) Entry {
	// TODO
	return Entry{}
}

// Read lit sur le réplica ReplicaFor(user, n) si sa position atteint Seen(user), sinon au leader (source -1).
// Dans les deux cas, Seen(user) avance jusqu'à la position de la source lue (jamais en arrière).
func (r *Router) Read(user, key string) (value string, ok bool, source int) {
	// TODO
	return "", false, -1
}
