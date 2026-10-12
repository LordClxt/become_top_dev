package lab

import (
	"errors"
	"hash/fnv"
	"sort"
	"strings"
)

// ---------- Jalon 1 : exécution en série (procédures stockées) ----------

var ErrClosed = errors.New("exécuteur fermé")

// Store est la base en mémoire que voient les procédures stockées. Les écritures sont annulées si la procédure échoue.
type Store struct {
	data map[string]int
	undo map[string]undoEntry // valeur d'origine de chaque clé écrite par la procédure en cours
}

type undoEntry struct {
	value  int
	exists bool
}

func newStore() *Store { return &Store{data: map[string]int{}} }

// Get renvoie la valeur de la clé (0 si elle n'existe pas).
func (s *Store) Get(key string) int { return s.data[key] }

// Set écrit la clé en retenant sa valeur d'origine pour pouvoir annuler.
func (s *Store) Set(key string, v int) {
	if s.undo != nil {
		if _, seen := s.undo[key]; !seen {
			old, ok := s.data[key]
			s.undo[key] = undoEntry{old, ok}
		}
	}
	s.data[key] = v
}

// rollback défait les écritures de la procédure en cours.
func (s *Store) rollback() {
	for k, u := range s.undo {
		if u.exists {
			s.data[k] = u.value
		} else {
			delete(s.data, k)
		}
	}
}

type job struct {
	proc func(s *Store) error
	done chan error
}

// Executor exécute les procédures stockées une par une, dans une seule goroutine : aucune concurrence, donc sérialisable.
type Executor struct {
	jobs   chan job
	closed chan struct{}
	store  *Store
}

func NewExecutor() *Executor {
	e := &Executor{jobs: make(chan job), closed: make(chan struct{}), store: newStore()}
	go e.loop()
	return e
}

func (e *Executor) loop() {
	for {
		select {
		case j := <-e.jobs:
			e.store.undo = map[string]undoEntry{}
			err := j.proc(e.store)
			if err != nil {
				e.store.rollback()
			}
			e.store.undo = nil
			j.done <- err
		case <-e.closed:
			return
		}
	}
}

// Exec soumet une procédure et attend son résultat. Si la procédure renvoie une erreur, toutes ses écritures sont annulées.
// ErrClosed si l'exécuteur est fermé.
func (e *Executor) Exec(proc func(s *Store) error) error {
	j := job{proc: proc, done: make(chan error, 1)}
	select {
	case e.jobs <- j:
		return <-j.done
	case <-e.closed:
		return ErrClosed
	}
}

// Close arrête l'exécuteur.
func (e *Executor) Close() {
	select {
	case <-e.closed:
	default:
		close(e.closed)
	}
}

// PartitionedExecutor donne à chaque partition son propre exécuteur : les transactions d'une même partition restent
// en série, celles de partitions différentes avancent en parallèle.
type PartitionedExecutor struct {
	parts []*Executor
}

func NewPartitionedExecutor(n int) *PartitionedExecutor {
	p := &PartitionedExecutor{}
	for i := 0; i < n; i++ {
		p.parts = append(p.parts, NewExecutor())
	}
	return p
}

// PartitionOf renvoie la partition d'une clé (hachage FNV modulo le nombre de partitions).
func (p *PartitionedExecutor) PartitionOf(key string) int {
	h := fnv.New32a()
	h.Write([]byte(key))
	return int(h.Sum32() % uint32(len(p.parts)))
}

// Exec exécute une procédure dans la partition de la clé.
func (p *PartitionedExecutor) Exec(key string, proc func(s *Store) error) error {
	return p.parts[p.PartitionOf(key)].Exec(proc)
}

func (p *PartitionedExecutor) Close() {
	for _, e := range p.parts {
		e.Close()
	}
}

// ---------- Jalon 2 : verrouillage en deux phases ----------

// Mode est le mode d'un verrou.
type Mode int

const (
	Shared Mode = iota
	Exclusive
)

// Outcome est la réponse à une demande de verrou.
type Outcome int

const (
	Granted  Outcome = iota // accordé
	Waiting                 // la transaction doit attendre
	Deadlock                // accorder créerait un interblocage : la demande est refusée, la transaction doit être annulée
)

type waiter struct {
	tx   int
	mode Mode
}

type lockState struct {
	holders map[int]Mode
	queue   []waiter
}

// LockManager implémente les verrous partagés / exclusifs de 2PL, sans bloquer : il dit si la transaction doit attendre.
type LockManager struct {
	locks map[string]*lockState
}

func NewLockManager() *LockManager { return &LockManager{locks: map[string]*lockState{}} }

func (lm *LockManager) state(key string) *lockState {
	ls := lm.locks[key]
	if ls == nil {
		ls = &lockState{holders: map[int]Mode{}}
		lm.locks[key] = ls
	}
	return ls
}

// compatible dit si tx peut obtenir ce mode alors que les autres détenteurs ont leurs verrous.
func compatible(ls *lockState, tx int, mode Mode) bool {
	for h, hm := range ls.holders {
		if h == tx {
			continue
		}
		if mode == Exclusive || hm == Exclusive {
			return false
		}
	}
	return true
}

// Acquire demande un verrou. Déjà détenu en mode suffisant → Granted. Partagé → exclusif (promotion) possible si tx est
// seul détenteur. Sinon, si le verrou est compatible avec les détenteurs ET que personne n'attend → Granted. Sinon la
// transaction entre dans la file : Waiting, ou Deadlock si cela crée un cycle d'attentes (dans ce cas, la demande est retirée).
func (lm *LockManager) Acquire(tx int, key string, mode Mode) Outcome {
	ls := lm.state(key)
	if cur, ok := ls.holders[tx]; ok && (cur == Exclusive || mode == Shared) {
		return Granted
	}
	_, upgrading := ls.holders[tx]
	if compatible(ls, tx, mode) && (len(ls.queue) == 0 || upgrading) {
		ls.holders[tx] = mode
		return Granted
	}
	ls.queue = append(ls.queue, waiter{tx, mode})
	if lm.hasCycle(tx) {
		ls.queue = ls.queue[:len(ls.queue)-1]
		return Deadlock
	}
	return Waiting
}

// waitsFor renvoie les transactions qui bloquent tx : les détenteurs incompatibles avec ce qu'il attend.
func (lm *LockManager) waitsFor(tx int) []int {
	var out []int
	for _, ls := range lm.locks {
		for _, w := range ls.queue {
			if w.tx != tx {
				continue
			}
			for h := range ls.holders {
				if h != tx && (w.mode == Exclusive || ls.holders[h] == Exclusive) {
					out = append(out, h)
				}
			}
		}
	}
	return out
}

// hasCycle dit si tx peut atteindre tx en suivant les attentes.
func (lm *LockManager) hasCycle(tx int) bool {
	seen := map[int]bool{}
	var visit func(t int) bool
	visit = func(t int) bool {
		for _, n := range lm.waitsFor(t) {
			if n == tx {
				return true
			}
			if !seen[n] {
				seen[n] = true
				if visit(n) {
					return true
				}
			}
		}
		return false
	}
	return visit(tx)
}

// Holds renvoie le mode dans lequel tx détient la clé.
func (lm *LockManager) Holds(tx int, key string) (Mode, bool) {
	ls := lm.locks[key]
	if ls == nil {
		return Shared, false
	}
	m, ok := ls.holders[tx]
	return m, ok
}

// ReleaseAll relâche tous les verrous de tx (fin de la transaction : validation ou annulation) et retire ses attentes.
// Il accorde ensuite, clé par clé et dans l'ordre de la file, les verrous qui deviennent possibles, et renvoie les
// transactions débloquées (sans doublon, dans l'ordre d'octroi, clés triées).
func (lm *LockManager) ReleaseAll(tx int) []int {
	keys := make([]string, 0, len(lm.locks))
	for k := range lm.locks {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	var unblocked []int
	seen := map[int]bool{}
	for _, k := range keys {
		ls := lm.locks[k]
		delete(ls.holders, tx)
		q := ls.queue[:0:0]
		for _, w := range ls.queue {
			if w.tx != tx {
				q = append(q, w)
			}
		}
		ls.queue = q
		for len(ls.queue) > 0 {
			w := ls.queue[0]
			if !compatible(ls, w.tx, w.mode) {
				break
			}
			ls.holders[w.tx] = w.mode
			ls.queue = ls.queue[1:]
			if !seen[w.tx] {
				seen[w.tx] = true
				unblocked = append(unblocked, w.tx)
			}
		}
	}
	return unblocked
}

// ---------- Jalon 3 : validation optimiste sur instantané (le cœur de SSI) ----------

var ErrSerialization = errors.New("conflit de sérialisation : la transaction s'appuyait sur une prémisse périmée")

type kv struct {
	seq     int
	value   string
	deleted bool
}

type commitRecord struct {
	seq    int
	writes map[string]bool
}

// OptimisticDB offre l'isolation par instantané et vérifie à la validation que les lectures de la transaction n'ont pas été
// invalidées par une transaction validée depuis son début.
type OptimisticDB struct {
	seq      int
	versions map[string][]kv
	log      []commitRecord
}

func NewOptimisticDB() *OptimisticDB { return &OptimisticDB{versions: map[string][]kv{}} }

// OTx est une transaction optimiste.
type OTx struct {
	db       *OptimisticDB
	start    int
	reads    map[string]bool // clés lues
	prefixes []string        // recherches par préfixe (prédicats)
	writes   map[string]kv
	done     bool
}

func (db *OptimisticDB) Begin() *OTx {
	return &OTx{db: db, start: db.seq, reads: map[string]bool{}, writes: map[string]kv{}}
}

func (t *OTx) snapshotValue(key string) (string, bool) {
	vs := t.db.versions[key]
	for i := len(vs) - 1; i >= 0; i-- {
		if vs[i].seq <= t.start {
			if vs[i].deleted {
				return "", false
			}
			return vs[i].value, true
		}
	}
	return "", false
}

// Get lit une clé : d'abord les écritures de la transaction, sinon l'instantané du début. La clé est mémorisée comme lue.
func (t *OTx) Get(key string) (string, bool) {
	if w, ok := t.writes[key]; ok {
		return w.value, !w.deleted
	}
	t.reads[key] = true
	return t.snapshotValue(key)
}

// Scan renvoie, triés par clé, les couples (clé, valeur) de l'instantané et des écritures de la transaction dont la clé
// commence par prefix. Le préfixe est mémorisé comme prédicat de lecture : une insertion concurrente le rendra périmé.
func (t *OTx) Scan(prefix string) ([]string, []string) {
	t.prefixes = append(t.prefixes, prefix)
	vals := map[string]string{}
	for k := range t.db.versions {
		if strings.HasPrefix(k, prefix) {
			if v, ok := t.snapshotValue(k); ok {
				vals[k] = v
			}
		}
	}
	for k, w := range t.writes {
		if strings.HasPrefix(k, prefix) {
			if w.deleted {
				delete(vals, k)
			} else {
				vals[k] = w.value
			}
		}
	}
	keys := make([]string, 0, len(vals))
	for k := range vals {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	out := make([]string, len(keys))
	for i, k := range keys {
		out[i] = vals[k]
	}
	return keys, out
}

func (t *OTx) Put(key, value string) { t.writes[key] = kv{value: value} }
func (t *OTx) Delete(key string)     { t.writes[key] = kv{deleted: true} }
func (t *OTx) Abort()                { t.done = true }

// Commit valide la transaction. Une transaction sans écriture réussit toujours. Sinon, elle est annulée avec
// ErrSerialization si une transaction validée depuis son début a écrit une clé qu'elle a lue, ou une clé qui correspond
// à l'un de ses préfixes de recherche. Sinon ses écritures reçoivent le prochain numéro de validation.
func (t *OTx) Commit() error {
	if t.done {
		return ErrSerialization
	}
	t.done = true
	if len(t.writes) == 0 {
		return nil
	}
	for _, c := range t.db.log {
		if c.seq <= t.start {
			continue
		}
		for k := range c.writes {
			if t.reads[k] {
				return ErrSerialization
			}
			for _, p := range t.prefixes {
				if strings.HasPrefix(k, p) {
					return ErrSerialization
				}
			}
		}
	}
	t.db.seq++
	rec := commitRecord{seq: t.db.seq, writes: map[string]bool{}}
	for k, w := range t.writes {
		w.seq = t.db.seq
		t.db.versions[k] = append(t.db.versions[k], w)
		rec.writes[k] = true
	}
	t.db.log = append(t.db.log, rec)
	return nil
}
