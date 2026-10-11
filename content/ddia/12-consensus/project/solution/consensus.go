package lab

import "errors"

// ---------- Partie 1 : validation en deux phases ----------

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

// Run exécute 2PC pour tx et renvoie la décision.
func (c *Coordinator) Run(tx string) (Decision, error) {
	for _, r := range c.Log.Records {
		if r.Tx == tx {
			return "", ErrDuplicate
		}
	}
	c.Log.Append(tx, "begin")
	d := Commit
	for _, p := range c.Participants {
		if err := p.Prepare(tx); err != nil {
			d = Abort
			break
		}
	}
	if c.CrashAfter == "prepare" {
		return "", ErrCrashed
	}
	c.Log.Append(tx, string(d)) // point de non-retour : la décision est durable avant d'être diffusée
	if c.CrashAfter == "decision" {
		return "", ErrCrashed
	}
	c.finish(tx, d)
	return d, nil
}

// finish diffuse la décision à tous les participants et écrit "end" si tous ont acquitté.
func (c *Coordinator) finish(tx string, d Decision) bool {
	ok := true
	for _, p := range c.Participants {
		var err error
		if d == Commit {
			err = p.Commit(tx)
		} else {
			err = p.Abort(tx)
		}
		if err != nil {
			ok = false
		}
	}
	if ok {
		c.Log.Append(tx, "end")
	}
	return ok
}

// Recover relit le journal : une transaction sans décision est annulée (et on l'écrit), une décision non
// terminée est renvoyée. Renvoie la décision de chaque transaction traitée.
func (c *Coordinator) Recover() map[string]Decision {
	var order []string
	state := map[string]string{}
	for _, r := range c.Log.Records {
		if _, seen := state[r.Tx]; !seen {
			order = append(order, r.Tx)
		}
		state[r.Tx] = r.Kind
	}
	out := map[string]Decision{}
	for _, tx := range order {
		switch state[tx] {
		case "end":
			continue
		case "begin":
			c.Log.Append(tx, string(Abort))
			out[tx] = Abort
		default:
			out[tx] = Decision(state[tx])
		}
		c.finish(tx, out[tx])
	}
	return out
}

// ---------- Partie 2 : noyau Raft ----------

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

func (n *Node) majority() int { return (len(n.Peers)+1)/2 + 1 }

// observe applique la règle des termes : un terme plus grand fait redevenir follower.
func (n *Node) observe(term int) {
	if term > n.CurrentTerm {
		n.CurrentTerm, n.VotedFor, n.Role = term, 0, Follower
	}
}

type VoteRequest struct{ Term, CandidateID, LastLogIndex, LastLogTerm int }

type VoteReply struct {
	Term    int
	Granted bool
}

func (n *Node) HandleVote(req VoteRequest) VoteReply {
	n.observe(req.Term)
	if req.Term < n.CurrentTerm {
		return VoteReply{Term: n.CurrentTerm}
	}
	li, lt := n.LastLog()
	upToDate := req.LastLogTerm > lt || (req.LastLogTerm == lt && req.LastLogIndex >= li)
	if (n.VotedFor == 0 || n.VotedFor == req.CandidateID) && upToDate {
		n.VotedFor = req.CandidateID
		return VoteReply{Term: n.CurrentTerm, Granted: true}
	}
	return VoteReply{Term: n.CurrentTerm}
}

// Elect fait candidater c auprès des nœuds joignables et renvoie true s'il devient leader.
func Elect(c *Node, reachable []*Node) bool {
	c.CurrentTerm++
	c.Role, c.VotedFor = Candidate, c.ID
	li, lt := c.LastLog()
	req := VoteRequest{Term: c.CurrentTerm, CandidateID: c.ID, LastLogIndex: li, LastLogTerm: lt}
	votes := 1
	for _, p := range reachable {
		r := p.HandleVote(req)
		if r.Term > c.CurrentTerm {
			c.observe(r.Term)
			return false
		}
		if r.Granted {
			votes++
		}
	}
	if votes < c.majority() {
		return false
	}
	c.Role = Leader
	for _, id := range c.Peers {
		c.NextIndex[id], c.MatchIndex[id] = li+1, 0
	}
	return true
}

// ---------- Partie 3 : réplication ----------

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

// Propose ajoute une commande au log du leader et renvoie son index.
func (n *Node) Propose(cmd string) (int, error) {
	if n.Role != Leader {
		return 0, ErrNotLeader
	}
	n.Log = append(n.Log, Entry{Term: n.CurrentTerm, Cmd: cmd})
	return len(n.Log), nil
}

func (n *Node) HandleAppend(req AppendRequest) AppendReply {
	if req.Term < n.CurrentTerm {
		return AppendReply{Term: n.CurrentTerm}
	}
	n.observe(req.Term)
	n.Role = Follower
	if req.PrevLogIndex > len(n.Log) || (req.PrevLogIndex > 0 && n.Log[req.PrevLogIndex-1].Term != req.PrevLogTerm) {
		return AppendReply{Term: n.CurrentTerm}
	}
	for i, e := range req.Entries {
		idx := req.PrevLogIndex + 1 + i
		if idx <= len(n.Log) && n.Log[idx-1].Term != e.Term {
			n.Log = n.Log[:idx-1] // conflit : on tronque à partir d'ici
		}
		if idx > len(n.Log) {
			n.Log = append(n.Log, e)
		}
	}
	last := req.PrevLogIndex + len(req.Entries)
	if req.LeaderCommit > n.CommitIndex {
		n.CommitIndex = min(req.LeaderCommit, last)
	}
	return AppendReply{Term: n.CurrentTerm, Success: true, MatchIndex: last}
}

// Replicate envoie à chaque follower joignable ce qui lui manque (en reculant NextIndex après un refus),
// puis avance le CommitIndex du leader.
func Replicate(l *Node, reachable []*Node) {
	for _, f := range reachable {
		for l.Role == Leader {
			next := max(l.NextIndex[f.ID], 1)
			prev := next - 1
			req := AppendRequest{Term: l.CurrentTerm, LeaderID: l.ID, PrevLogIndex: prev, LeaderCommit: l.CommitIndex}
			if prev > 0 {
				req.PrevLogTerm = l.Log[prev-1].Term
			}
			req.Entries = append([]Entry(nil), l.Log[prev:]...)
			r := f.HandleAppend(req)
			if r.Term > l.CurrentTerm {
				l.observe(r.Term)
				return
			}
			if r.Success {
				l.MatchIndex[f.ID], l.NextIndex[f.ID] = r.MatchIndex, r.MatchIndex+1
				break
			}
			l.NextIndex[f.ID] = prev
		}
	}
	for n := len(l.Log); n > l.CommitIndex; n-- {
		if l.Log[n-1].Term != l.CurrentTerm {
			break // seules les entrées du terme courant se valident par comptage
		}
		count := 1
		for _, id := range l.Peers {
			if l.MatchIndex[id] >= n {
				count++
			}
		}
		if count >= l.majority() {
			l.CommitIndex = n
			break
		}
	}
}
