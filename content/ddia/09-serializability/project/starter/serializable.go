package lab

import (
	"errors"
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

func newStore() *Store {
	// TODO
	return &Store{data: map[string]int{}}
}

// Get renvoie la valeur de la clé (0 si elle n'existe pas).
func (s *Store) Get(key string) int {
	// TODO
	return s.data[key]
}

// Set écrit la clé en retenant sa valeur d'origine pour pouvoir annuler.
func (s *Store) Set(key string, v int) {}

// rollback défait les écritures de la procédure en cours.
func (s *Store) rollback() {}

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

func (e *Executor) loop() {}

// Exec soumet une procédure et attend son résultat. Si la procédure renvoie une erreur, toutes ses écritures sont annulées.
// ErrClosed si l'exécuteur est fermé.
func (e *Executor) Exec(proc func(s *Store) error) error {
	// TODO
	return *new(error)
}

// Close arrête l'exécuteur.
func (e *Executor) Close() {}

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
	// TODO
	return *new(int)
}

// Exec exécute une procédure dans la partition de la clé.
func (p *PartitionedExecutor) Exec(key string, proc func(s *Store) error) error {
	// TODO
	return *new(error)
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

func NewLockManager() *LockManager {
	// TODO
	return &LockManager{locks: map[string]*lockState{}}
}

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
	// TODO
	return *new(Outcome)
}

// waitsFor renvoie les transactions qui bloquent tx : les détenteurs incompatibles avec ce qu'il attend.
func (lm *LockManager) waitsFor(tx int) []int {
	// TODO
	return *new([]int)
}

// hasCycle dit si tx peut atteindre tx en suivant les attentes.
func (lm *LockManager) hasCycle(tx int) bool {
	// TODO
	return *new(bool)
}

// Holds renvoie le mode dans lequel tx détient la clé.
func (lm *LockManager) Holds(tx int, key string) (Mode, bool) {
	// TODO
	return *new(Mode), *new(bool)
}

// ReleaseAll relâche tous les verrous de tx (fin de la transaction : validation ou annulation) et retire ses attentes.
// Il accorde ensuite, clé par clé et dans l'ordre de la file, les verrous qui deviennent possibles, et renvoie les
// transactions débloquées (sans doublon, dans l'ordre d'octroi, clés triées).
func (lm *LockManager) ReleaseAll(tx int) []int {
	// TODO
	return *new([]int)
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

func NewOptimisticDB() *OptimisticDB {
	// TODO
	return &OptimisticDB{versions: map[string][]kv{}}
}

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
	// TODO
	return *new(*OTx)
}

func (t *OTx) snapshotValue(key string) (string, bool) {
	// TODO
	return *new(string), *new(bool)
}

// Get lit une clé : d'abord les écritures de la transaction, sinon l'instantané du début. La clé est mémorisée comme lue.
func (t *OTx) Get(key string) (string, bool) {
	// TODO
	return *new(string), *new(bool)
}

// Scan renvoie, triés par clé, les couples (clé, valeur) de l'instantané et des écritures de la transaction dont la clé
// commence par prefix. Le préfixe est mémorisé comme prédicat de lecture : une insertion concurrente le rendra périmé.
func (t *OTx) Scan(prefix string) ([]string, []string) {
	// TODO
	return *new([]string), *new([]string)
}

func (t *OTx) Put(key, value string) {}
func (t *OTx) Delete(key string)     {}
func (t *OTx) Abort()                {}

// Commit valide la transaction. Une transaction sans écriture réussit toujours. Sinon, elle est annulée avec
// ErrSerialization si une transaction validée depuis son début a écrit une clé qu'elle a lue, ou une clé qui correspond
// à l'un de ses préfixes de recherche. Sinon ses écritures reçoivent le prochain numéro de validation.
func (t *OTx) Commit() error {
	// TODO
	return *new(error)
}
