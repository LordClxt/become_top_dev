package lab

import (
	"errors"
	"sort"
	"sync"
)

// TxID identifie une transaction. Les identifiants sont strictement croissants : 1, 2, 3…
type TxID uint64

// Status est l'état d'une transaction.
type Status int

const (
	InProgress Status = iota
	Committed
	Aborted
)

// Version est une version d'une valeur. CreatedBy : la transaction qui l'a écrite.
// DeletedBy : la transaction qui l'a remplacée ou supprimée (0 tant que personne ne l'a fait).
type Version struct {
	Value     string
	CreatedBy TxID
	DeletedBy TxID
}

// KV est un couple clé-valeur renvoyé par Scan.
type KV struct {
	Key, Value string
}

var (
	ErrTxClosed      = errors.New("transaction déjà validée ou abandonnée")
	ErrWriteConflict = errors.New("conflit d'écriture : une transaction concurrente a déjà validé cette clé")
)

// Store est un moteur clé-valeur multiversion en mémoire.
type Store struct {
	mu       sync.Mutex
	next     TxID
	status   map[TxID]Status
	xmin     map[TxID]TxID // pour chaque transaction en cours : la plus ancienne transaction qu'elle ignore
	versions map[string][]*Version
}

// Tx est une transaction en snapshot isolation.
type Tx struct {
	s      *Store
	id     TxID
	active map[TxID]bool   // transactions en cours au démarrage (invisibles pour toujours)
	writes map[string]bool // clés écrites (Put ou Delete)
	done   bool
}

// NewStore crée un moteur vide.
func NewStore() *Store {
	return &Store{next: 1, status: map[TxID]Status{}, xmin: map[TxID]TxID{}, versions: map[string][]*Version{}}
}

// Versions renvoie une copie des versions d'une clé, dans l'ordre de création.
func (s *Store) Versions(key string) []Version {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := make([]Version, 0, len(s.versions[key]))
	for _, v := range s.versions[key] {
		out = append(out, *v)
	}
	return out
}

// Status renvoie l'état d'une transaction.
func (s *Store) Status(id TxID) Status {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.status[id]
}

// ---------- Jalon 1 : identifiants et versions ----------

// Begin démarre une transaction : nouvel identifiant, et photo des transactions en cours.
func (s *Store) Begin() *Tx {
	s.mu.Lock()
	defer s.mu.Unlock()
	tx := &Tx{s: s, id: s.next, active: map[TxID]bool{}, writes: map[string]bool{}}
	s.next++
	xmin := tx.id
	for id, st := range s.status {
		if st == InProgress {
			tx.active[id] = true
			xmin = min(xmin, id)
		}
	}
	s.status[tx.id] = InProgress
	s.xmin[tx.id] = xmin
	return tx
}

// ID renvoie l'identifiant de la transaction.
func (tx *Tx) ID() TxID { return tx.id }

// pending renvoie l'index de la version écrite par tx pour key, ou -1.
func (tx *Tx) pending(key string) int {
	for i, v := range tx.s.versions[key] {
		if v.CreatedBy == tx.id {
			return i
		}
	}
	return -1
}

// Put écrit une nouvelle version, invisible des autres jusqu'au commit.
func (tx *Tx) Put(key, value string) error {
	tx.s.mu.Lock()
	defer tx.s.mu.Unlock()
	if tx.done {
		return ErrTxClosed
	}
	if i := tx.pending(key); i >= 0 {
		tx.s.versions[key][i].Value = value
	} else {
		tx.s.versions[key] = append(tx.s.versions[key], &Version{Value: value, CreatedBy: tx.id})
	}
	tx.writes[key] = true
	return nil
}

// Delete supprime la clé (effet visible des autres au commit).
func (tx *Tx) Delete(key string) error {
	tx.s.mu.Lock()
	defer tx.s.mu.Unlock()
	if tx.done {
		return ErrTxClosed
	}
	if i := tx.pending(key); i >= 0 {
		vs := tx.s.versions[key]
		tx.s.versions[key] = append(vs[:i:i], vs[i+1:]...)
	}
	tx.writes[key] = true
	return nil
}

// Commit valide : la dernière version validée et vivante de chaque clé écrite reçoit DeletedBy.
func (tx *Tx) Commit() error {
	s := tx.s
	s.mu.Lock()
	defer s.mu.Unlock()
	if tx.done {
		return ErrTxClosed
	}
	tx.done = true
	for key := range tx.writes {
		if s.conflicts(tx, key) {
			s.status[tx.id] = Aborted
			delete(s.xmin, tx.id)
			return ErrWriteConflict
		}
	}
	for key := range tx.writes {
		vs := s.versions[key]
		for i := len(vs) - 1; i >= 0; i-- {
			if s.status[vs[i].CreatedBy] == Committed && vs[i].DeletedBy == 0 {
				vs[i].DeletedBy = tx.id
				break
			}
		}
	}
	s.status[tx.id] = Committed
	delete(s.xmin, tx.id)
	return nil
}

// Abort abandonne : les versions écrites restent mais seront ignorées de tous.
func (tx *Tx) Abort() error {
	tx.s.mu.Lock()
	defer tx.s.mu.Unlock()
	if tx.done {
		return ErrTxClosed
	}
	tx.done = true
	tx.s.status[tx.id] = Aborted
	delete(tx.s.xmin, tx.id)
	return nil
}

// ---------- Jalon 2 : règles de visibilité ----------

// sees dit si les effets de la transaction id font partie du snapshot de tx.
func (tx *Tx) sees(id TxID) bool {
	if id == tx.id {
		return true
	}
	return id != 0 && id < tx.id && !tx.active[id] && tx.s.status[id] == Committed
}

// visible applique les règles : création vue, et suppression non vue.
func (tx *Tx) visible(v *Version) bool {
	return tx.sees(v.CreatedBy) && (v.DeletedBy == 0 || !tx.sees(v.DeletedBy))
}

// get lit une clé ; le verrou est déjà pris.
func (tx *Tx) get(key string) (string, bool) {
	if tx.writes[key] {
		if i := tx.pending(key); i >= 0 {
			return tx.s.versions[key][i].Value, true
		}
		return "", false
	}
	vs := tx.s.versions[key]
	for i := len(vs) - 1; i >= 0; i-- {
		if tx.visible(vs[i]) {
			return vs[i].Value, true
		}
	}
	return "", false
}

// Get lit la valeur visible dans le snapshot (ou sa propre écriture).
func (tx *Tx) Get(key string) (string, bool, error) {
	tx.s.mu.Lock()
	defer tx.s.mu.Unlock()
	if tx.done {
		return "", false, ErrTxClosed
	}
	v, ok := tx.get(key)
	return v, ok, nil
}

// Scan renvoie toutes les clés visibles, triées.
func (tx *Tx) Scan() ([]KV, error) {
	tx.s.mu.Lock()
	defer tx.s.mu.Unlock()
	if tx.done {
		return nil, ErrTxClosed
	}
	out := []KV{}
	for key := range tx.s.versions {
		if v, ok := tx.get(key); ok {
			out = append(out, KV{key, v})
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Key < out[j].Key })
	return out, nil
}

// ---------- Jalon 3 : premier qui valide gagne, et nettoyage ----------

// conflicts dit si une transaction validée hors du snapshot de tx a écrit key.
func (s *Store) conflicts(tx *Tx, key string) bool {
	concurrent := func(id TxID) bool {
		return id != 0 && id != tx.id && s.status[id] == Committed && !tx.sees(id)
	}
	for _, v := range s.versions[key] {
		if concurrent(v.CreatedBy) || concurrent(v.DeletedBy) {
			return true
		}
	}
	return false
}

// Vacuum supprime les versions qu'aucune transaction présente ou future ne peut voir, et renvoie leur nombre.
func (s *Store) Vacuum() int {
	s.mu.Lock()
	defer s.mu.Unlock()
	horizon := s.next // toute transaction validée avant l'horizon est vue de toutes les transactions en cours
	for _, x := range s.xmin {
		horizon = min(horizon, x)
	}
	removed := 0
	for key, vs := range s.versions {
		kept := vs[:0]
		for _, v := range vs {
			dead := s.status[v.CreatedBy] == Aborted ||
				(v.DeletedBy != 0 && s.status[v.DeletedBy] == Committed && v.DeletedBy < horizon)
			if dead {
				removed++
			} else {
				kept = append(kept, v)
			}
		}
		if len(kept) == 0 {
			delete(s.versions, key)
		} else {
			s.versions[key] = kept
		}
	}
	return removed
}
