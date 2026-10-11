package lab

import (
	"errors"
	"sync"
)

// (fourni) TxID identifie une transaction. Les identifiants sont strictement croissants : 1, 2, 3…
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

var errTodo = errors.New("à implémenter")

// Begin démarre une transaction : nouvel identifiant (1, 2, 3…), statut InProgress, et photo des transactions
// en cours à cet instant (champ active) — elles resteront invisibles pour toujours. Pense aussi à s.xmin.
func (s *Store) Begin() *Tx {
	// TODO
	return &Tx{s: s, active: map[TxID]bool{}, writes: map[string]bool{}}
}

// ID renvoie l'identifiant de la transaction.
func (tx *Tx) ID() TxID { return tx.id }

// Put écrit une nouvelle version {value, CreatedBy: tx.id}, invisible des autres jusqu'au commit.
// Un second Put sur la même clé remplace la valeur de la version en attente (une seule par clé et par transaction).
// Transaction terminée : ErrTxClosed.
func (tx *Tx) Put(key, value string) error {
	// TODO
	return errTodo
}

// Delete supprime la clé : retire la version en attente de tx s'il y en a une, et note la clé comme écrite.
// La suppression de la version validée n'est marquée qu'au commit.
func (tx *Tx) Delete(key string) error {
	// TODO
	return errTodo
}

// Commit valide : pour chaque clé écrite, la dernière version validée et vivante (DeletedBy == 0) reçoit
// DeletedBy = tx.id, puis le statut passe à Committed. Jalon 3 : refuser d'abord les conflits (ErrWriteConflict).
func (tx *Tx) Commit() error {
	// TODO
	return errTodo
}

// Abort abandonne : statut Aborted ; les versions écrites restent mais seront ignorées de tous.
func (tx *Tx) Abort() error {
	// TODO
	return errTodo
}

// ---------- Jalon 2 : règles de visibilité ----------

// Get lit la clé : d'abord les propres écritures de tx (Put ou Delete), sinon la version visible dans le snapshot.
// Visible = créée par tx, ou par une transaction validée, d'identifiant plus petit, absente de active ;
// et pas supprimée par une transaction qui remplit ces mêmes conditions.
func (tx *Tx) Get(key string) (string, bool, error) {
	// TODO
	return "", false, errTodo
}

// Scan renvoie toutes les clés visibles (avec les propres écritures de tx), triées par clé. Jamais nil.
func (tx *Tx) Scan() ([]KV, error) {
	// TODO
	return nil, errTodo
}

// ---------- Jalon 3 : premier qui valide gagne, et nettoyage ----------

// Vacuum supprime les versions qu'aucune transaction présente ou future ne peut voir : celles des transactions
// abandonnées, et celles supprimées par une transaction validée que TOUTES les transactions en cours voient.
// Renvoie le nombre de versions supprimées.
func (s *Store) Vacuum() int {
	// TODO
	return 0
}
