package lab

import (
	"errors"
	"hash/fnv"
	"maps"
)

// Entry est un changement du log de réplication : sa position (LSN), l'époque du leader qui l'a écrit, et l'écriture.
type Entry struct {
	LSN   uint64
	Epoch uint64
	Key   string
	Value string
}

// Snapshot est une image cohérente des données, associée à la position exacte du log qu'elle contient.
type Snapshot struct {
	Data  map[string]string
	LSN   uint64
	Epoch uint64
}

var (
	ErrGap            = errors.New("trou dans le log : une entrée manque")
	ErrStaleEpoch     = errors.New("entrée d'une époque périmée : elle vient d'un ancien leader")
	ErrSnapshotNeeded = errors.New("position antérieure au log conservé : il faut repartir d'un snapshot")
	ErrNoCandidate    = errors.New("aucun follower à promouvoir")
	ErrEpoch          = errors.New("la nouvelle époque doit dépasser toutes les époques connues")
)

// ---------- Jalon 1 : le log et le rattrapage ----------

// Leader reçoit les écritures et les ajoute à son log de réplication.
type Leader struct {
	epoch uint64
	base  uint64 // LSN couvert par l'état initial ; le log commence à base+1
	log   []Entry
	data  map[string]string
}

// NewLeader crée un leader vide à l'époque donnée.
func NewLeader(epoch uint64) *Leader {
	return &Leader{epoch: epoch, data: map[string]string{}}
}

// Epoch renvoie l'époque du leader.
func (l *Leader) Epoch() uint64 { return l.epoch }

// LastLSN renvoie la position de la dernière entrée du log.
func (l *Leader) LastLSN() uint64 { return l.base + uint64(len(l.log)) }

// Put applique l'écriture localement, l'ajoute au log et renvoie l'entrée créée.
func (l *Leader) Put(key, value string) Entry {
	e := Entry{LSN: l.LastLSN() + 1, Epoch: l.epoch, Key: key, Value: value}
	l.log = append(l.log, e)
	l.data[key] = value
	return e
}

// Get lit une clé sur le leader.
func (l *Leader) Get(key string) (string, bool) {
	v, ok := l.data[key]
	return v, ok
}

// Since renvoie une copie des entrées de position strictement supérieure à lsn.
func (l *Leader) Since(lsn uint64) ([]Entry, error) {
	if lsn < l.base {
		return nil, ErrSnapshotNeeded
	}
	if lsn >= l.LastLSN() {
		return []Entry{}, nil
	}
	return append([]Entry(nil), l.log[lsn-l.base:]...), nil
}

// Snapshot renvoie une copie des données et la position qu'elles contiennent.
func (l *Leader) Snapshot() Snapshot {
	return Snapshot{Data: maps.Clone(l.data), LSN: l.LastLSN(), Epoch: l.epoch}
}

// Follower applique, dans l'ordre, les entrées reçues du leader.
type Follower struct {
	epoch   uint64
	base    uint64
	applied uint64
	log     []Entry
	data    map[string]string
}

// NewFollower crée un follower à partir d'un snapshot ; il ne modifie pas le snapshot.
func NewFollower(s Snapshot) *Follower {
	data := maps.Clone(s.Data)
	if data == nil {
		data = map[string]string{}
	}
	return &Follower{epoch: s.Epoch, base: s.LSN, applied: s.LSN, data: data}
}

// Position renvoie la dernière position appliquée.
func (f *Follower) Position() uint64 { return f.applied }

// Epoch renvoie la plus haute époque connue du follower.
func (f *Follower) Epoch() uint64 { return f.epoch }

// Get lit une clé sur le follower.
func (f *Follower) Get(key string) (string, bool) {
	v, ok := f.data[key]
	return v, ok
}

// Apply applique les entrées envoyées par un leader d'époque epoch, dans l'ordre, et s'arrête à la première erreur
// (les entrées précédentes restent appliquées). Leader d'une époque inférieure à celle connue : ErrStaleEpoch, rien
// n'est appliqué. Entrée déjà appliquée : ignorée. Position sautée : ErrGap.
func (f *Follower) Apply(epoch uint64, entries []Entry) error {
	if epoch < f.epoch {
		return ErrStaleEpoch
	}
	f.epoch = epoch
	for _, e := range entries {
		if e.LSN <= f.applied {
			continue
		}
		if e.LSN != f.applied+1 {
			return ErrGap
		}
		f.data[e.Key] = e.Value
		f.log = append(f.log, e)
		f.applied = e.LSN
	}
	return nil
}

// CatchUp demande au leader tout ce qui suit sa position et l'applique.
func (f *Follower) CatchUp(l *Leader) error {
	entries, err := l.Since(f.applied)
	if err != nil {
		return err
	}
	return f.Apply(l.Epoch(), entries)
}

// ---------- Jalon 2 : le failover ----------

// Promote choisit le follower le plus avancé (à égalité, le premier), annonce la nouvelle époque à tous les
// followers, et renvoie un leader qui reprend ses données et son log. Les followers ne sont pas retirés de la slice.
func Promote(followers []*Follower, epoch uint64) (*Leader, int, error) {
	if len(followers) == 0 {
		return nil, -1, ErrNoCandidate
	}
	best := 0
	for i, f := range followers {
		if f.epoch >= epoch {
			return nil, -1, ErrEpoch
		}
		if f.applied > followers[best].applied {
			best = i
		}
	}
	for _, f := range followers {
		f.epoch = epoch
	}
	c := followers[best]
	l := &Leader{epoch: epoch, base: c.base, log: append([]Entry(nil), c.log...), data: maps.Clone(c.data)}
	return l, best, nil
}

// LostWrites renvoie les entrées de l'ancien leader que le nouveau n'a jamais reçues (position > promotedAt).
func LostWrites(old *Leader, promotedAt uint64) []Entry {
	lost, err := old.Since(promotedAt)
	if err != nil {
		return append([]Entry(nil), old.log...)
	}
	return lost
}

// ---------- Jalon 3 : le routeur de lectures ----------

// ReplicaFor choisit le réplica d'un utilisateur par hachage FNV-1a de son identifiant. (fourni)
func ReplicaFor(user string, n int) int {
	h := fnv.New32a()
	h.Write([]byte(user))
	return int(h.Sum32() % uint32(n))
}

// Router envoie les écritures au leader et chaque utilisateur vers un réplica fixe, sauf si ce réplica n'a pas
// atteint la plus haute position que l'utilisateur a écrite ou lue.
type Router struct {
	leader    *Leader
	followers []*Follower
	seen      map[string]uint64
}

// NewRouter crée un routeur.
func NewRouter(l *Leader, followers []*Follower) *Router {
	return &Router{leader: l, followers: followers, seen: map[string]uint64{}}
}

// Write écrit au leader et retient la position de l'écriture pour l'utilisateur.
func (r *Router) Write(user, key, value string) Entry {
	e := r.leader.Put(key, value)
	r.remember(user, e.LSN)
	return e
}

// Read lit sur le réplica de l'utilisateur s'il est assez avancé, sinon au leader. source vaut l'indice du
// follower, ou -1 pour le leader.
func (r *Router) Read(user, key string) (value string, ok bool, source int) {
	if len(r.followers) > 0 {
		i := ReplicaFor(user, len(r.followers))
		if f := r.followers[i]; f.Position() >= r.seen[user] {
			r.remember(user, f.Position())
			value, ok = f.Get(key)
			return value, ok, i
		}
	}
	r.remember(user, r.leader.LastLSN())
	value, ok = r.leader.Get(key)
	return value, ok, -1
}

// Seen renvoie la plus haute position écrite ou lue par l'utilisateur.
func (r *Router) Seen(user string) uint64 { return r.seen[user] }

func (r *Router) remember(user string, lsn uint64) {
	if lsn > r.seen[user] {
		r.seen[user] = lsn
	}
}
