package lab

import (
	"errors"
	"fmt"
	"slices"
	"sort"
)

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

type request struct {
	tx   TxID
	mode Mode
}

type lockState struct {
	holders map[TxID]Mode
	queue   []request
}

type waitInfo struct {
	key  string
	mode Mode
}

// LockManager attribue des verrous partagés et exclusifs selon le 2PL. (fourni)
type LockManager struct {
	locks   map[string]*lockState
	held    map[TxID]map[string]bool
	waiting map[TxID]waitInfo
}

// NewLockManager crée un gestionnaire vide. (fourni)
func NewLockManager() *LockManager {
	return &LockManager{
		locks:   map[string]*lockState{},
		held:    map[TxID]map[string]bool{},
		waiting: map[TxID]waitInfo{},
	}
}

func (lm *LockManager) state(key string) *lockState {
	st, ok := lm.locks[key]
	if !ok {
		st = &lockState{holders: map[TxID]Mode{}}
		lm.locks[key] = st
	}
	return st
}

func compatible(a, b Mode) bool { return a == Shared && b == Shared }

// blockers renvoie les détenteurs (autres que tx) dont le verrou est incompatible avec mode.
func (st *lockState) blockers(tx TxID, mode Mode) []TxID {
	var out []TxID
	for h, m := range st.holders {
		if h != tx && !compatible(m, mode) {
			out = append(out, h)
		}
	}
	return out
}

// Acquire demande un verrou. Il renvoie true si le verrou est accordé, false si la transaction doit attendre.
func (lm *LockManager) Acquire(tx TxID, key string, mode Mode) (bool, error) {
	if mode != Shared && mode != Exclusive {
		return false, ErrBadMode
	}
	if _, ok := lm.waiting[tx]; ok {
		return false, ErrBlocked
	}
	st := lm.state(key)
	cur, holds := st.holders[tx]
	if holds && cur >= mode {
		return true, nil // déjà détenu, au moins aussi fort
	}
	// Une nouvelle venue ne double pas la file (équité) ; une montée de verrou, si.
	if len(st.blockers(tx, mode)) == 0 && (holds || len(st.queue) == 0) {
		lm.grant(tx, key, mode)
		return true, nil
	}
	st.queue = append(st.queue, request{tx, mode})
	lm.waiting[tx] = waitInfo{key, mode}
	if lm.reaches(tx, tx, map[TxID]bool{}) {
		st.queue = st.queue[:len(st.queue)-1]
		delete(lm.waiting, tx)
		return false, ErrDeadlock
	}
	return false, nil
}

func (lm *LockManager) grant(tx TxID, key string, mode Mode) {
	st := lm.state(key)
	if mode > st.holders[tx] {
		st.holders[tx] = mode
	}
	if lm.held[tx] == nil {
		lm.held[tx] = map[string]bool{}
	}
	lm.held[tx][key] = true
}

// reaches dit si l'on atteint target en suivant le graphe d'attente depuis from.
func (lm *LockManager) reaches(from, target TxID, seen map[TxID]bool) bool {
	for _, next := range lm.WaitsFor(from) {
		if next == target {
			return true
		}
		if !seen[next] {
			seen[next] = true
			if lm.reaches(next, target, seen) {
				return true
			}
		}
	}
	return false
}

// WaitsFor renvoie, triées, les transactions que tx attend : détenteurs incompatibles et demandes placées avant
// elle dans la file. Une transaction qui n'attend pas n'attend personne.
func (lm *LockManager) WaitsFor(tx TxID) []TxID {
	w, ok := lm.waiting[tx]
	if !ok {
		return nil
	}
	st := lm.locks[w.key]
	set := map[TxID]bool{}
	for _, b := range st.blockers(tx, w.mode) {
		set[b] = true
	}
	for _, r := range st.queue {
		if r.tx == tx {
			break
		}
		set[r.tx] = true
	}
	out := make([]TxID, 0, len(set))
	for t := range set {
		out = append(out, t)
	}
	slices.Sort(out)
	return out
}

// Holders renvoie une copie des détenteurs d'une clé et de leur mode.
func (lm *LockManager) Holders(key string) map[TxID]Mode {
	out := map[TxID]Mode{}
	if st, ok := lm.locks[key]; ok {
		for t, m := range st.holders {
			out[t] = m
		}
	}
	return out
}

// ReleaseAll relâche tous les verrous de tx (commit ou abandon) et retire sa demande en attente. Il accorde
// ensuite, clé par clé dans l'ordre alphabétique, les demandes en tête de file devenues compatibles, et renvoie
// les transactions débloquées dans cet ordre.
func (lm *LockManager) ReleaseAll(tx TxID) []TxID {
	touched := map[string]bool{}
	for key := range lm.held[tx] {
		delete(lm.locks[key].holders, tx)
		touched[key] = true
	}
	delete(lm.held, tx)
	if w, ok := lm.waiting[tx]; ok {
		st := lm.locks[w.key]
		st.queue = slices.DeleteFunc(st.queue, func(r request) bool { return r.tx == tx })
		delete(lm.waiting, tx)
		touched[w.key] = true
	}
	keys := make([]string, 0, len(touched))
	for k := range touched {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	var granted []TxID
	for _, key := range keys {
		st := lm.locks[key]
		for len(st.queue) > 0 {
			r := st.queue[0]
			if len(st.blockers(r.tx, r.mode)) > 0 {
				break
			}
			st.queue = st.queue[1:]
			delete(lm.waiting, r.tx)
			lm.grant(r.tx, key, r.mode)
			granted = append(granted, r.tx)
		}
	}
	return granted
}

// ---------- Jalon 3 : le validateur SSI ----------

type ssiTx struct {
	start  int64
	reads  map[string]bool
	writes map[string]bool
}

type commitRecord struct {
	tx     TxID
	ts     int64
	writes map[string]bool
}

// SSI valide des transactions optimistes au commit. (fourni)
type SSI struct {
	clock     int64
	active    map[TxID]*ssiTx
	committed []commitRecord
}

// NewSSI crée un validateur vide. (fourni)
func NewSSI() *SSI { return &SSI{active: map[TxID]*ssiTx{}} }

// Begin ouvre une transaction : son snapshot contient tout ce qui a été validé jusqu'ici.
func (s *SSI) Begin(tx TxID) error {
	if _, ok := s.active[tx]; ok {
		return ErrTxExists
	}
	s.active[tx] = &ssiTx{start: s.clock, reads: map[string]bool{}, writes: map[string]bool{}}
	return nil
}

func (s *SSI) get(tx TxID) (*ssiTx, error) {
	t, ok := s.active[tx]
	if !ok {
		return nil, ErrUnknownTx
	}
	return t, nil
}

// Read note que tx a lu key : c'est une prémisse.
func (s *SSI) Read(tx TxID, key string) error {
	t, err := s.get(tx)
	if err != nil {
		return err
	}
	t.reads[key] = true
	return nil
}

// Write note que tx écrit key (l'écriture ne prend effet qu'au commit).
func (s *SSI) Write(tx TxID, key string) error {
	t, err := s.get(tx)
	if err != nil {
		return err
	}
	t.writes[key] = true
	return nil
}

// Commit valide tx, ou l'abandonne avec ErrSerialization si elle a écrit alors qu'une transaction validée après
// son début a écrit une clé qu'elle a lue ou écrite. Une transaction en lecture seule valide toujours.
// Dans les deux cas, tx n'est plus active.
func (s *SSI) Commit(tx TxID) error {
	t, err := s.get(tx)
	if err != nil {
		return err
	}
	delete(s.active, tx)
	defer s.prune()
	if len(t.writes) > 0 {
		for _, rec := range s.committed {
			if rec.ts <= t.start {
				continue
			}
			for key := range rec.writes {
				if t.reads[key] || t.writes[key] {
					return fmt.Errorf("%w : T%d a lu ou écrit %q, modifié par T%d", ErrSerialization, tx, key, rec.tx)
				}
			}
		}
		s.clock++
		s.committed = append(s.committed, commitRecord{tx: tx, ts: s.clock, writes: t.writes})
	}
	return nil
}

// Abort abandonne tx sans rien valider.
func (s *SSI) Abort(tx TxID) error {
	if _, err := s.get(tx); err != nil {
		return err
	}
	delete(s.active, tx)
	s.prune()
	return nil
}

// prune oublie les validations qu'aucune transaction active ne peut plus voir comme concurrentes.
func (s *SSI) prune() {
	oldest := s.clock
	for _, t := range s.active {
		oldest = min(oldest, t.start)
	}
	s.committed = slices.DeleteFunc(s.committed, func(r commitRecord) bool { return r.ts <= oldest })
}

// Retained renvoie le nombre de validations encore gardées en mémoire pour la détection.
func (s *SSI) Retained() int { return len(s.committed) }
