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
	s := snapshot{next: db.nextID, inProgress: map[int]bool{}}
	for id, st := range db.state {
		if st == active && id != self {
			s.inProgress[id] = true
		}
	}
	return s
}

// txVisible dit si les écritures de la transaction id sont visibles pour `self` avec l'instantané s.
func (db *DB) txVisible(id, self int, s snapshot) bool {
	if id == self {
		return true
	}
	return db.state[id] == committed && id < s.next && !s.inProgress[id]
}

// Begin démarre une transaction : identifiant croissant, instantané pris tout de suite.
func (db *DB) Begin(level Isolation) *Tx {
	t := &Tx{db: db, id: db.nextID, level: level}
	db.nextID++
	db.state[t.id] = active
	db.txs[t.id] = t
	t.snap = db.takeSnapshot(t.id)
	return t
}

// visibleVersion renvoie la version de la clé visible avec l'instantané s : créée par une transaction visible
// et non supprimée par une transaction visible.
func (t *Tx) visibleVersion(key string, s snapshot) *version {
	var best *version
	for _, v := range t.db.rows[key] {
		if !t.db.txVisible(v.createdBy, t.id, s) {
			continue
		}
		if v.deletedBy != 0 && t.db.txVisible(v.deletedBy, t.id, s) {
			continue
		}
		best = v
	}
	return best
}

// Get lit une clé. En ReadCommitted, l'instantané est repris à chaque lecture ; en SnapshotIsolation, c'est celui du début.
func (t *Tx) Get(key string) (string, bool) {
	if t.done {
		return "", false
	}
	s := t.snap
	if t.level == ReadCommitted {
		s = t.db.takeSnapshot(t.id)
	}
	v := t.visibleVersion(key, s)
	if v == nil {
		return "", false
	}
	return v.value, true
}

func (t *Tx) write(key, value string, del bool) error {
	if t.done {
		return ErrFinished
	}
	db := t.db
	if owner, ok := db.locks[key]; ok && owner != t.id {
		return ErrLocked
	}
	for _, v := range db.rows[key] {
		if v.createdBy != t.id && db.state[v.createdBy] == active {
			return ErrLocked // écriture sale interdite
		}
		if v.deletedBy != 0 && v.deletedBy != t.id && db.state[v.deletedBy] == active {
			return ErrLocked
		}
	}
	if t.level == SnapshotIsolation && t.hasConcurrentCommit(key) {
		return ErrConflict
	}
	for _, v := range db.rows[key] {
		live := (db.state[v.createdBy] == committed || v.createdBy == t.id) && (v.deletedBy == 0 || db.state[v.deletedBy] == aborted)
		if live {
			v.deletedBy = t.id
		}
	}
	if !del {
		db.rows[key] = append(db.rows[key], &version{value: value, createdBy: t.id})
	}
	return nil
}

// Put écrit une clé. ErrLocked si une autre transaction non terminée a écrit ou verrouillé la clé (écriture sale).
func (t *Tx) Put(key, value string) error { return t.write(key, value, false) }

// Delete supprime une clé (mêmes erreurs que Put).
func (t *Tx) Delete(key string) error { return t.write(key, "", true) }

func (t *Tx) finish(st status) {
	t.db.state[t.id] = st
	delete(t.db.txs, t.id)
	for k, owner := range t.db.locks {
		if owner == t.id {
			delete(t.db.locks, k)
		}
	}
	t.done = true
}

// Commit valide toutes les écritures d'un coup et libère les verrous.
func (t *Tx) Commit() error {
	if t.done {
		return ErrFinished
	}
	t.finish(committed)
	return nil
}

// Abort annule toutes les écritures de la transaction et libère les verrous.
func (t *Tx) Abort() {
	if !t.done {
		t.finish(aborted)
	}
}

// ---------- Jalon 2 : l'instantané et le nettoyage ----------

// Vacuum supprime les versions que plus personne ne peut voir : celles créées par des transactions annulées, et celles
// dont la suppression est validée et visible pour toutes les transactions SnapshotIsolation encore en cours (et donc pour
// toutes les futures). Renvoie le nombre de versions supprimées.
func (db *DB) Vacuum() int {
	removed := 0
	for key, vs := range db.rows {
		kept := vs[:0:0]
		for _, v := range vs {
			dead := db.state[v.createdBy] == aborted
			if !dead && v.deletedBy != 0 && db.state[v.deletedBy] == committed {
				dead = true
				for _, t := range db.txs {
					if t.level == SnapshotIsolation && !(v.deletedBy < t.snap.next && !t.snap.inProgress[v.deletedBy]) {
						dead = false
					}
				}
			}
			if dead {
				removed++
			} else {
				kept = append(kept, v)
			}
		}
		db.rows[key] = kept
	}
	return removed
}

// ---------- Jalon 3 : mises à jour perdues et verrous explicites ----------

// hasConcurrentCommit dit si une transaction validée mais INVISIBLE dans l'instantané de t a créé ou supprimé une version de la clé.
func (t *Tx) hasConcurrentCommit(key string) bool {
	for _, v := range t.db.rows[key] {
		if t.db.state[v.createdBy] == committed && !t.db.txVisible(v.createdBy, t.id, t.snap) {
			return true
		}
		if v.deletedBy != 0 && t.db.state[v.deletedBy] == committed && !t.db.txVisible(v.deletedBy, t.id, t.snap) {
			return true
		}
	}
	return false
}

// Lock verrouille explicitement des clés jusqu'à la fin de la transaction (SELECT … FOR UPDATE). Tout ou rien :
// si une clé est déjà verrouillée par une autre transaction, ErrLocked et aucun verrou n'est pris.
func (t *Tx) Lock(keys ...string) error {
	if t.done {
		return ErrFinished
	}
	for _, k := range keys {
		if owner, ok := t.db.locks[k]; ok && owner != t.id {
			return ErrLocked
		}
	}
	for _, k := range keys {
		t.db.locks[k] = t.id
	}
	return nil
}

// CompareAndSet écrit newVal si la valeur validée de la clé est oldVal, en une seule opération atomique.
func (db *DB) CompareAndSet(key, oldVal, newVal string) bool {
	t := db.Begin(ReadCommitted)
	cur, ok := t.Get(key)
	if !ok || cur != oldVal || t.Put(key, newVal) != nil {
		t.Abort()
		return false
	}
	return t.Commit() == nil
}
