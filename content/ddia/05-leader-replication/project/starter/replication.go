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
	errTodo         = errors.New("à implémenter")
)

// ---------- Jalon 1 : le log et le follower ----------

// Leader reçoit les écritures et les numérote. base est le LSN de l'instantané d'où part son log (0 = depuis le début).
// Tu peux ajouter des champs. (fourni, à compléter)
type Leader struct {
	mu   sync.Mutex
	base uint64
	log  []Entry
	data map[string]string
}

func NewLeader() *Leader { return &Leader{data: map[string]string{}} }

// Put et Delete ajoutent une entrée au log avec le LSN suivant (le premier LSN est 1), mettent à jour les données
// du leader et renvoient le LSN attribué.
func (l *Leader) Put(key, value string) uint64 {
	// TODO
	return 0
}

func (l *Leader) Delete(key string) uint64 {
	// TODO
	return 0
}

func (l *Leader) Get(key string) (string, bool) {
	v, ok, _ := l.GetAt(key)
	return v, ok
}

// GetAt renvoie la valeur, sa présence, et le LSN du leader au moment de la lecture.
func (l *Leader) GetAt(key string) (string, bool, uint64) {
	// TODO
	return "", false, 0
}

// LastLSN est le LSN de la dernière écriture (0 si aucune).
func (l *Leader) LastLSN() uint64 {
	// TODO
	return 0
}

// Since renvoie une COPIE des entrées de LSN strictement supérieur à lsn.
// Si lsn est plus ancien que le début du log (lsn < base) : ErrLogTruncated.
func (l *Leader) Since(lsn uint64) ([]Entry, error) {
	// TODO
	return nil, errTodo
}

// Follower applique le log du leader, dans l'ordre, et garde son propre log (comme le dit le livre).
type Follower struct {
	mu   sync.Mutex
	base uint64
	log  []Entry
	data map[string]string
}

func NewFollower() *Follower { return &Follower{data: map[string]string{}} }

// AppliedLSN est le LSN de la dernière entrée appliquée (base + longueur du log).
func (f *Follower) AppliedLSN() uint64 {
	// TODO
	return 0
}

// Apply applique une entrée : déjà vue (LSN <= appliqué) → ignorée sans erreur ; la suivante exacte → appliquée ;
// plus loin → ErrGap, sans rien modifier.
func (f *Follower) Apply(e Entry) error {
	// TODO
	return errTodo
}

func (f *Follower) Get(key string) (string, bool) {
	v, ok, _ := f.GetAt(key)
	return v, ok
}

// GetAt renvoie la valeur, sa présence et le LSN appliqué au moment de la lecture.
func (f *Follower) GetAt(key string) (string, bool, uint64) {
	// TODO
	return "", false, 0
}

// CatchUp réclame au leader tout ce qui suit le dernier LSN appliqué et l'applique. Renvoie le nombre d'entrées appliquées.
func (f *Follower) CatchUp(l *Leader) (int, error) {
	// TODO
	return 0, errTodo
}

// ---------- Jalon 2 : nouveau follower, retard, failover ----------

// Snapshot renvoie une COPIE cohérente des données et le LSN auquel elle correspond.
func (l *Leader) Snapshot() (map[string]string, uint64) {
	// TODO
	return nil, 0
}

// NewFollowerFromSnapshot crée un follower déjà positionné au LSN de l'instantané (copie les données).
func NewFollowerFromSnapshot(snap map[string]string, lsn uint64) *Follower {
	// TODO
	return NewFollower()
}

// Lag est le nombre d'écritures du leader que le follower n'a pas encore appliquées (0 s'il est à jour).
func Lag(l *Leader, f *Follower) uint64 {
	// TODO
	return 0
}

// MostUpToDate renvoie l'indice du follower le plus avancé (à égalité, le plus petit indice), ou -1 s'il n'y en a pas.
func MostUpToDate(fs []*Follower) int {
	// TODO
	return -2
}

// Promote fait d'un follower le nouveau leader : il garde son log et ses données, et continue la numérotation.
func Promote(f *Follower) *Leader {
	// TODO
	return NewLeader()
}

// LostWrites compte les écritures confirmées par l'ancien leader (jusqu'à oldLast) que le follower promu n'a jamais reçues.
func LostWrites(oldLast uint64, promoted *Follower) uint64 {
	// TODO
	return 0
}

// ---------- Jalon 3 : un routeur qui garantit la lecture de ses écritures ----------

// Session suit ce qu'un utilisateur a écrit et vu. (fournie)
type Session struct {
	LastWrite uint64 // LSN de sa dernière écriture
	MinSeen   uint64 // LSN le plus récent qu'il a déjà observé en lecture
}

// Router envoie les écritures au leader et les lectures aux followers quand c'est sûr. (fourni, à compléter)
type Router struct {
	leader      *Leader
	followers   []*Follower
	LeaderReads int // lectures qui ont dû aller au leader
}

func NewRouter(l *Leader, fs ...*Follower) *Router { return &Router{leader: l, followers: fs} }

// Write écrit au leader et mémorise le LSN dans la session.
func (r *Router) Write(s *Session, key, value string) uint64 {
	// TODO
	return 0
}

// Read lit sur le premier follower assez avancé pour que la session voie ses écritures (LastWrite) ET ne revienne jamais
// en arrière (MinSeen) ; à défaut, lit au leader et incrémente LeaderReads. La session retient le LSN observé.
func (r *Router) Read(s *Session, key string) (string, bool) {
	// TODO
	return "", false
}
