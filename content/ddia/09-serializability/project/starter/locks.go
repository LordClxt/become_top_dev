package lab

import "errors"

// Mode est le mode d'un verrou. (fourni)
type Mode int

const (
	Shared    Mode = 1 // verrou partagé : lecture
	Exclusive Mode = 2 // verrou exclusif : écriture
)

// TxID identifie une transaction. (fourni)
type TxID int

// Erreurs à renvoyer. (fournies)
var (
	ErrBadMode       = errors.New("mode de verrou invalide")
	ErrBlocked       = errors.New("transaction déjà en attente d'un verrou")
	ErrDeadlock      = errors.New("interblocage : la transaction est choisie comme victime")
	ErrUnknownTx     = errors.New("transaction inconnue")
	ErrTxExists      = errors.New("transaction déjà commencée")
	ErrSerialization = errors.New("conflit de sérialisation : prémisse périmée")
)

// ---------- Jalons 1 et 2 : le gestionnaire de verrous 2PL ----------

// Une suggestion de structures (fournie) : tu peux les modifier.
type request struct {
	tx   TxID
	mode Mode
}

type lockState struct {
	holders map[TxID]Mode // qui détient un verrou sur la clé, et dans quel mode
	queue   []request     // demandes en attente, dans l'ordre d'arrivée
}

type waitInfo struct {
	key  string
	mode Mode
}

// LockManager attribue des verrous partagés et exclusifs selon le 2PL. (fourni)
type LockManager struct {
	locks   map[string]*lockState
	held    map[TxID]map[string]bool // clés verrouillées par chaque transaction
	waiting map[TxID]waitInfo        // la demande en attente de chaque transaction bloquée
}

// NewLockManager crée un gestionnaire vide. (fourni)
func NewLockManager() *LockManager {
	return &LockManager{
		locks:   map[string]*lockState{},
		held:    map[TxID]map[string]bool{},
		waiting: map[TxID]waitInfo{},
	}
}

// Acquire demande un verrou. Il renvoie true si le verrou est accordé, false si la transaction doit attendre
// (sa demande est alors placée en fin de file).
//   - Mode invalide : ErrBadMode. Transaction déjà en attente : ErrBlocked.
//   - Un verrou déjà détenu dans un mode au moins aussi fort est accordé tout de suite.
//   - Seuls deux verrous partagés sont compatibles. Une nouvelle demande ne double pas une file non vide ;
//     une montée de verrou (partagé → exclusif) est accordée dès que personne d'autre ne détient la clé.
//   - Jalon 2 : si attendre créerait un cycle dans le graphe d'attente, la demande n'est pas mise en file et
//     Acquire renvoie ErrDeadlock (la transaction est la victime ; l'appelant fera ReleaseAll).
func (lm *LockManager) Acquire(tx TxID, key string, mode Mode) (bool, error) {
	// TODO
	return false, errors.New("à implémenter")
}

// WaitsFor renvoie, triées, les transactions que tx attend : les détenteurs dont le verrou est incompatible avec
// sa demande, et les demandes placées avant elle dans la file. Une transaction qui n'attend pas : nil.
func (lm *LockManager) WaitsFor(tx TxID) []TxID {
	// TODO (jalon 2)
	return nil
}

// Holders renvoie une copie des détenteurs d'une clé et de leur mode.
func (lm *LockManager) Holders(key string) map[TxID]Mode {
	// TODO
	return nil
}

// ReleaseAll relâche tous les verrous de tx (commit ou abandon) et retire sa demande en attente. Il accorde
// ensuite, clé par clé dans l'ordre alphabétique, les demandes en tête de file devenues compatibles (et s'arrête
// à la première qui ne l'est pas), et renvoie les transactions débloquées dans cet ordre.
func (lm *LockManager) ReleaseAll(tx TxID) []TxID {
	// TODO
	return nil
}

// ---------- Jalon 3 : le validateur SSI ----------

// Une suggestion de structures (fournie) : tu peux les modifier.
type ssiTx struct {
	start  int64           // horloge des commits au moment du Begin
	reads  map[string]bool // les prémisses
	writes map[string]bool
}

type commitRecord struct {
	tx     TxID
	ts     int64 // valeur de l'horloge attribuée au commit
	writes map[string]bool
}

// SSI valide des transactions optimistes au commit. (fourni)
type SSI struct {
	clock     int64 // nombre de commits (avec écriture) déjà validés
	active    map[TxID]*ssiTx
	committed []commitRecord
}

// NewSSI crée un validateur vide. (fourni)
func NewSSI() *SSI { return &SSI{active: map[TxID]*ssiTx{}} }

// Begin ouvre une transaction : son snapshot contient tout ce qui a été validé jusqu'ici. Déjà active : ErrTxExists.
func (s *SSI) Begin(tx TxID) error {
	// TODO
	return errors.New("à implémenter")
}

// Read note que tx a lu key : c'est une prémisse. Transaction inconnue : ErrUnknownTx.
func (s *SSI) Read(tx TxID, key string) error {
	// TODO
	return errors.New("à implémenter")
}

// Write note que tx écrit key (l'écriture ne prend effet qu'au commit). Transaction inconnue : ErrUnknownTx.
func (s *SSI) Write(tx TxID, key string) error {
	// TODO
	return errors.New("à implémenter")
}

// Commit valide tx, ou l'abandonne avec une erreur qui enveloppe ErrSerialization si elle a écrit alors qu'une
// transaction validée après son début a écrit une clé qu'elle a lue ou écrite. Une transaction en lecture seule
// valide toujours. Dans les deux cas, tx n'est plus active, et les validations qu'aucune transaction active ne
// peut plus voir comme concurrentes sont oubliées.
func (s *SSI) Commit(tx TxID) error {
	// TODO
	return errors.New("à implémenter")
}

// Abort abandonne tx sans rien valider (puis oublie ce qui peut l'être, comme Commit).
func (s *SSI) Abort(tx TxID) error {
	// TODO
	return errors.New("à implémenter")
}

// Retained renvoie le nombre de validations encore gardées en mémoire pour la détection.
func (s *SSI) Retained() int {
	// TODO
	return -1
}
