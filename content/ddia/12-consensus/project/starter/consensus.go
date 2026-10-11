package lab

import "errors"

// ---------- Partie 1 : validation en deux phases (types fournis) ----------

// Decision est l'issue d'une transaction distribuée.
type Decision string

const (
	Commit Decision = "commit"
	Abort  Decision = "abort"
)

// Participant est une base qui prend part à 2PC. Prepare renvoie nil pour voter oui.
type Participant interface {
	Prepare(tx string) error
	Commit(tx string) error
	Abort(tx string) error
}

// Record est une ligne du journal du coordinateur : Kind vaut "begin", "commit", "abort" ou "end".
type Record struct {
	Tx   string
	Kind string
}

// TxLog est le journal durable du coordinateur : il survit à un crash.
type TxLog struct {
	Records []Record
}

// Append ajoute une ligne au journal.
func (l *TxLog) Append(tx, kind string) { l.Records = append(l.Records, Record{Tx: tx, Kind: kind}) }

var (
	ErrCrashed   = errors.New("coordinateur arrêté (crash simulé)")
	ErrDuplicate = errors.New("transaction déjà commencée")
)

// Coordinator pilote 2PC. CrashAfter simule une panne : "prepare" (après les votes, avant la décision)
// ou "decision" (juste après avoir journalisé la décision).
type Coordinator struct {
	Log          *TxLog
	Participants []Participant
	CrashAfter   string
}

// ---------- Jalon 1 : le coordinateur 2PC ----------

// Run exécute 2PC pour tx et renvoie la décision.
// tx déjà présent au journal : ErrDuplicate. Écrire "begin", envoyer Prepare à chacun (un refus ou une erreur
// suffit pour décider Abort), journaliser la décision AVANT de la diffuser, puis envoyer Commit ou Abort à tous
// et écrire "end" seulement si tous ont acquitté. CrashAfter : renvoyer ErrCrashed au bon moment.
func (c *Coordinator) Run(tx string) (Decision, error) {
	// TODO
	return "", errors.New("à implémenter")
}

// Recover relit le journal : une transaction sans décision est annulée (et on l'écrit), une décision non
// terminée est renvoyée à tous. Renvoie la décision de chaque transaction traitée (rien pour celles finies par "end").
func (c *Coordinator) Recover() map[string]Decision {
	// TODO
	return nil
}

// ---------- Partie 2 : noyau Raft (types fournis) ----------

type Role int

const (
	Follower Role = iota
	Candidate
	Leader
)

// Entry est une entrée du log ; le log est indexé à partir de 1 (Log[0] est l'index 1).
type Entry struct {
	Term int
	Cmd  string
}

type Node struct {
	ID          int
	Peers       []int // identifiants des autres nœuds du cluster
	Role        Role
	CurrentTerm int
	VotedFor    int // 0 = personne dans ce terme
	Log         []Entry
	CommitIndex int
	NextIndex   map[int]int
	MatchIndex  map[int]int
}

func NewNode(id int, peers []int) *Node {
	return &Node{ID: id, Peers: peers, NextIndex: map[int]int{}, MatchIndex: map[int]int{}}
}

// LastLog renvoie l'index et le terme de la dernière entrée (0, 0 si le log est vide).
func (n *Node) LastLog() (index, term int) {
	if len(n.Log) == 0 {
		return 0, 0
	}
	return len(n.Log), n.Log[len(n.Log)-1].Term
}

type VoteRequest struct{ Term, CandidateID, LastLogIndex, LastLogTerm int }

type VoteReply struct {
	Term    int
	Granted bool
}

// ---------- Jalon 2 : l'élection ----------

// HandleVote applique la règle des termes (terme plus grand : l'adopter, VotedFor = 0, redevenir follower ;
// terme plus petit : refuser), puis accorde la voix si VotedFor vaut 0 ou CandidateID ET si le log du
// candidat est au moins aussi à jour (dernier terme, puis longueur). Répond toujours avec CurrentTerm.
func (n *Node) HandleVote(req VoteRequest) VoteReply {
	// TODO
	return VoteReply{}
}

// Elect fait candidater c auprès des nœuds joignables : terme + 1, rôle Candidate, vote pour soi, RequestVote
// à chacun. Une réponse de terme plus grand le fait redevenir follower (false). Avec une majorité du cluster
// (len(Peers)+1), il devient Leader : NextIndex = dernier index + 1 et MatchIndex = 0 pour chaque pair.
func Elect(c *Node, reachable []*Node) bool {
	// TODO
	return false
}

// ---------- Partie 3 : réplication (types fournis) ----------

var ErrNotLeader = errors.New("ce nœud n'est pas leader")

type AppendRequest struct {
	Term, LeaderID, PrevLogIndex, PrevLogTerm int
	Entries                                   []Entry
	LeaderCommit                              int
}

type AppendReply struct {
	Term       int
	Success    bool
	MatchIndex int
}

// ---------- Jalon 3 : réplication et validation ----------

// Propose ajoute une commande au log du leader (avec son terme) et renvoie son index ; sinon ErrNotLeader.
func (n *Node) Propose(cmd string) (int, error) {
	// TODO
	return 0, errors.New("à implémenter")
}

// HandleAppend : refuse un terme périmé ; sinon adopte le terme, redevient follower, fait la vérification de
// cohérence (PrevLogIndex, PrevLogTerm), tronque au premier conflit, ajoute ce qui manque, avance CommitIndex
// à min(LeaderCommit, dernier index reçu) et renvoie MatchIndex = PrevLogIndex + len(Entries).
func (n *Node) HandleAppend(req AppendRequest) AppendReply {
	// TODO
	return AppendReply{}
}

// Replicate envoie à chaque follower joignable ce qui lui manque (en reculant NextIndex après chaque refus),
// s'efface devant un terme plus grand, puis avance CommitIndex : le plus grand index du TERME COURANT détenu
// par une majorité (leader compris).
func Replicate(l *Node, reachable []*Node) {
	// TODO
}
