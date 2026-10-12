package lab

import "errors"

// Isolation est le niveau d'isolation d'une transaction.
type Isolation int

const (
	ReadCommitted     Isolation = iota // chaque lecture voit ce qui est validé à cet instant
	SnapshotIsolation                  // toute la transaction voit l'instantané pris à son début
)

// Erreurs à renvoyer. (fournies)
var (
	ErrLocked   = errors.New("clé verrouillée par une autre transaction")
	ErrConflict = errors.New("conflit d'écriture : une transaction concurrente a déjà validé cette clé")
	ErrFinished = errors.New("transaction terminée")
)

type status int

const (
	active status = iota
	committed
	aborted
)

// version est une version d'une ligne : elle est créée par une transaction et peut être supprimée par une autre
// (deletedBy = 0 : pas supprimée). Une mise à jour = supprimer l'ancienne version + créer une nouvelle. (fourni)
type version struct {
	value     string
	createdBy int
	deletedBy int
}

// snapshot dit quelles transactions sont visibles : celles validées, d'identifiant < next, et qui n'étaient pas en cours. (fourni)
type snapshot struct {
	next       int
	inProgress map[int]bool
}

// DB est une base clé-valeur multi-versions (MVCC). (fourni, à compléter)
type DB struct {
	nextID int
	state  map[int]status
	rows   map[string][]*version
	locks  map[string]int // clé → transaction qui la détient
	txs    map[int]*Tx    // transactions en cours
}

func NewDB() *DB {
	return &DB{nextID: 1, state: map[int]status{}, rows: map[string][]*version{}, locks: map[string]int{}, txs: map[int]*Tx{}}
}

// Tx est une transaction.
type Tx struct {
	db    *DB
	id    int
	level Isolation
	snap  snapshot
	done  bool
}

// ---------- Jalon 1 : read committed, atomicité, pas d'écriture sale ----------

// takeSnapshot photographie l'état courant pour la transaction `self`.
func (db *DB) takeSnapshot(self int) snapshot {
	// TODO
	return *new(snapshot)
}

// txVisible dit si les écritures de la transaction id sont visibles pour `self` avec l'instantané s.
func (db *DB) txVisible(id, self int, s snapshot) bool {
	// TODO
	return *new(bool)
}

// Begin démarre une transaction : identifiant croissant, instantané pris tout de suite.
func (db *DB) Begin(level Isolation) *Tx {
	// TODO
	return *new(*Tx)
}

// visibleVersion renvoie la version de la clé visible avec l'instantané s : créée par une transaction visible
// et non supprimée par une transaction visible.
func (t *Tx) visibleVersion(key string, s snapshot) *version {
	// TODO
	return *new(*version)
}

// Get lit une clé. En ReadCommitted, l'instantané est repris à chaque lecture ; en SnapshotIsolation, c'est celui du début.
func (t *Tx) Get(key string) (string, bool) {
	// TODO
	return *new(string), *new(bool)
}

func (t *Tx) write(key, value string, del bool) error {
	// TODO
	return *new(error)
}

// écriture sale interdite

// Put écrit une clé. ErrLocked si une autre transaction non terminée a écrit ou verrouillé la clé (écriture sale).
func (t *Tx) Put(key, value string) error {
	// TODO
	return t.write(key, value, false)
}

// Delete supprime une clé (mêmes erreurs que Put).
func (t *Tx) Delete(key string) error {
	// TODO
	return t.write(key, "", true)
}

func (t *Tx) finish(st status) {}

// Commit valide toutes les écritures d'un coup et libère les verrous.
func (t *Tx) Commit() error {
	// TODO
	return *new(error)
}

// Abort annule toutes les écritures de la transaction et libère les verrous.
func (t *Tx) Abort() {}

// ---------- Jalon 2 : l'instantané et le nettoyage ----------

// Vacuum supprime les versions que plus personne ne peut voir : celles créées par des transactions annulées, et celles
// dont la suppression est validée et visible pour toutes les transactions SnapshotIsolation encore en cours (et donc pour
// toutes les futures). Renvoie le nombre de versions supprimées.
func (db *DB) Vacuum() int {
	// TODO
	return *new(int)
}

// ---------- Jalon 3 : mises à jour perdues et verrous explicites ----------

// hasConcurrentCommit dit si une transaction validée mais INVISIBLE dans l'instantané de t a créé ou supprimé une version de la clé.
func (t *Tx) hasConcurrentCommit(key string) bool {
	// TODO
	return *new(bool)
}

// Lock verrouille explicitement des clés jusqu'à la fin de la transaction (SELECT … FOR UPDATE). Tout ou rien :
// si une clé est déjà verrouillée par une autre transaction, ErrLocked et aucun verrou n'est pris.
func (t *Tx) Lock(keys ...string) error {
	// TODO
	return *new(error)
}

// CompareAndSet écrit newVal si la valeur validée de la clé est oldVal, en une seule opération atomique.
func (db *DB) CompareAndSet(key, oldVal, newVal string) bool {
	// TODO
	return *new(bool)
}
