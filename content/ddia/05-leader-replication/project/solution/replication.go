package lab

import (
	"errors"
	"sync"
)

// Entry est une ligne du log de réplication. (fourni)
type Entry struct {
	LSN    uint64
	Key    string
	Value  string
	Delete bool
}

// Erreurs à renvoyer. (fournies)
var (
	ErrGap          = errors.New("trou dans le log de réplication")
	ErrLogTruncated = errors.New("log tronqué : repartir d'un instantané")
)

// ---------- Jalon 1 : le log et le follower ----------

// Leader reçoit les écritures et les numérote. base est le LSN de l'instantané d'où part son log (0 = depuis le début).
type Leader struct {
	mu   sync.Mutex
	base uint64
	log  []Entry
	data map[string]string
}

func NewLeader() *Leader { return &Leader{data: map[string]string{}} }

func (l *Leader) append(key, value string, del bool) uint64 {
	l.mu.Lock()
	defer l.mu.Unlock()
	lsn := l.base + uint64(len(l.log)) + 1
	l.log = append(l.log, Entry{LSN: lsn, Key: key, Value: value, Delete: del})
	if del {
		delete(l.data, key)
	} else {
		l.data[key] = value
	}
	return lsn
}

func (l *Leader) Put(key, value string) uint64 { return l.append(key, value, false) }
func (l *Leader) Delete(key string) uint64     { return l.append(key, "", true) }

func (l *Leader) Get(key string) (string, bool) {
	v, ok, _ := l.GetAt(key)
	return v, ok
}

// GetAt renvoie la valeur et le LSN du leader au moment de la lecture.
func (l *Leader) GetAt(key string) (string, bool, uint64) {
	l.mu.Lock()
	defer l.mu.Unlock()
	v, ok := l.data[key]
	return v, ok, l.base + uint64(len(l.log))
}

func (l *Leader) LastLSN() uint64 {
	l.mu.Lock()
	defer l.mu.Unlock()
	return l.base + uint64(len(l.log))
}

// Since renvoie une copie des entrées de LSN strictement supérieur à lsn.
func (l *Leader) Since(lsn uint64) ([]Entry, error) {
	l.mu.Lock()
	defer l.mu.Unlock()
	if lsn < l.base {
		return nil, ErrLogTruncated
	}
	idx := lsn - l.base
	if idx >= uint64(len(l.log)) {
		return nil, nil
	}
	return append([]Entry(nil), l.log[idx:]...), nil
}

// Follower applique le log du leader, dans l'ordre.
type Follower struct {
	mu   sync.Mutex
	base uint64
	log  []Entry
	data map[string]string
}

func NewFollower() *Follower { return &Follower{data: map[string]string{}} }

func (f *Follower) applied() uint64 { return f.base + uint64(len(f.log)) }

func (f *Follower) AppliedLSN() uint64 {
	f.mu.Lock()
	defer f.mu.Unlock()
	return f.applied()
}

// Apply applique une entrée : déjà vue → ignorée sans erreur ; la suivante → appliquée ; plus loin → ErrGap.
func (f *Follower) Apply(e Entry) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	switch {
	case e.LSN <= f.applied():
		return nil
	case e.LSN != f.applied()+1:
		return ErrGap
	}
	f.log = append(f.log, e)
	if e.Delete {
		delete(f.data, e.Key)
	} else {
		f.data[e.Key] = e.Value
	}
	return nil
}

func (f *Follower) Get(key string) (string, bool) {
	v, ok, _ := f.GetAt(key)
	return v, ok
}

// GetAt renvoie la valeur et le LSN appliqué au moment de la lecture.
func (f *Follower) GetAt(key string) (string, bool, uint64) {
	f.mu.Lock()
	defer f.mu.Unlock()
	v, ok := f.data[key]
	return v, ok, f.applied()
}

// CatchUp réclame au leader tout ce qui suit le dernier LSN appliqué et l'applique. Renvoie le nombre d'entrées appliquées.
func (f *Follower) CatchUp(l *Leader) (int, error) {
	entries, err := l.Since(f.AppliedLSN())
	if err != nil {
		return 0, err
	}
	for i, e := range entries {
		if err := f.Apply(e); err != nil {
			return i, err
		}
	}
	return len(entries), nil
}

// ---------- Jalon 2 : nouveau follower, retard, failover ----------

// Snapshot renvoie une copie cohérente des données et le LSN auquel elle correspond.
func (l *Leader) Snapshot() (map[string]string, uint64) {
	l.mu.Lock()
	defer l.mu.Unlock()
	cp := make(map[string]string, len(l.data))
	for k, v := range l.data {
		cp[k] = v
	}
	return cp, l.base + uint64(len(l.log))
}

// NewFollowerFromSnapshot crée un follower déjà positionné au LSN de l'instantané.
func NewFollowerFromSnapshot(snap map[string]string, lsn uint64) *Follower {
	cp := make(map[string]string, len(snap))
	for k, v := range snap {
		cp[k] = v
	}
	return &Follower{base: lsn, data: cp}
}

// Lag est le nombre d'écritures du leader que le follower n'a pas encore appliquées.
func Lag(l *Leader, f *Follower) uint64 {
	last, applied := l.LastLSN(), f.AppliedLSN()
	if applied >= last {
		return 0
	}
	return last - applied
}

// MostUpToDate renvoie l'indice du follower le plus avancé (à égalité, le plus petit indice), ou -1 s'il n'y en a pas.
func MostUpToDate(fs []*Follower) int {
	best := -1
	var bestLSN uint64
	for i, f := range fs {
		if lsn := f.AppliedLSN(); best == -1 || lsn > bestLSN {
			best, bestLSN = i, lsn
		}
	}
	return best
}

// Promote fait d'un follower le nouveau leader : il garde son log et ses données, et continue la numérotation.
func Promote(f *Follower) *Leader {
	f.mu.Lock()
	defer f.mu.Unlock()
	data := make(map[string]string, len(f.data))
	for k, v := range f.data {
		data[k] = v
	}
	return &Leader{base: f.base, log: append([]Entry(nil), f.log...), data: data}
}

// LostWrites compte les écritures confirmées par l'ancien leader (jusqu'à oldLast) que le follower promu n'a jamais reçues.
func LostWrites(oldLast uint64, promoted *Follower) uint64 {
	applied := promoted.AppliedLSN()
	if applied >= oldLast {
		return 0
	}
	return oldLast - applied
}

// ---------- Jalon 3 : un routeur qui garantit la lecture de ses écritures ----------

// Session suit ce qu'un utilisateur a écrit et vu.
type Session struct {
	LastWrite uint64 // LSN de sa dernière écriture
	MinSeen   uint64 // LSN le plus récent qu'il a déjà observé en lecture
}

// Router envoie les écritures au leader et les lectures aux followers quand c'est sûr.
type Router struct {
	leader      *Leader
	followers   []*Follower
	LeaderReads int // lectures qui ont dû aller au leader
}

func NewRouter(l *Leader, fs ...*Follower) *Router { return &Router{leader: l, followers: fs} }

// Write écrit au leader et mémorise le LSN dans la session.
func (r *Router) Write(s *Session, key, value string) uint64 {
	lsn := r.leader.Put(key, value)
	if lsn > s.LastWrite {
		s.LastWrite = lsn
	}
	return lsn
}

// Read lit sur le premier follower assez avancé pour que la session voie ses écritures ET ne revienne jamais en arrière ;
// à défaut, lit au leader. La session retient le LSN observé.
func (r *Router) Read(s *Session, key string) (string, bool) {
	need := s.LastWrite
	if s.MinSeen > need {
		need = s.MinSeen
	}
	for _, f := range r.followers {
		if f.AppliedLSN() < need {
			continue
		}
		v, ok, at := f.GetAt(key)
		if at < need {
			continue
		}
		if at > s.MinSeen {
			s.MinSeen = at
		}
		return v, ok
	}
	r.LeaderReads++
	v, ok, at := r.leader.GetAt(key)
	if at > s.MinSeen {
		s.MinSeen = at
	}
	return v, ok
}
