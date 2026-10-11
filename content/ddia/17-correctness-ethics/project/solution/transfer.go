package lab

import (
	"errors"
	"hash/fnv"
	"sort"
	"strings"
)

// Request est une demande de virement. ID est généré par le client et identifie l'intention. (fourni)
type Request struct {
	ID     string
	From   string
	To     string
	Amount int64
}

// Op distingue un débit d'un crédit. (fourni)
type Op int

const (
	Debit Op = iota + 1
	Credit
)

// Instruction est un message dérivé d'une requête, adressé à un seul compte. (fourni)
type Instruction struct {
	RequestID string
	Account   string
	Op        Op
	Amount    int64
}

// Erreurs à renvoyer. (fournies)
var (
	ErrInvalid = errors.New("requête invalide")
	ErrIDReuse = errors.New("identifiant déjà utilisé pour une autre requête")
)

// Partition renvoie la partition d'une clé : FNV-1a 32 bits modulo n. (fourni)
func Partition(key string, n int) int {
	h := fnv.New32a()
	h.Write([]byte(key))
	return int(h.Sum32() % uint32(n))
}

// ---------- Jalon 1 : une requête, un effet ----------

// Service ajoute les requêtes au log en supprimant les doublons par identifiant.
type Service struct {
	log  []Request
	seen map[string]int
}

func NewService() *Service {
	return &Service{seen: make(map[string]int)}
}

// Submit ajoute r au log et renvoie sa position. Une requête déjà vue (même ID, même contenu) renvoie la position
// d'origine avec dup = true, sans rien ajouter. Même ID et contenu différent : ErrIDReuse.
func (s *Service) Submit(r Request) (offset int, dup bool, err error) {
	if r.ID == "" || r.From == "" || r.To == "" || r.From == r.To || r.Amount <= 0 {
		return 0, false, ErrInvalid
	}
	if off, ok := s.seen[r.ID]; ok {
		if s.log[off] != r {
			return 0, false, ErrIDReuse
		}
		return off, true, nil
	}
	s.log = append(s.log, r)
	s.seen[r.ID] = len(s.log) - 1
	return len(s.log) - 1, false, nil
}

// Log renvoie une copie du log.
func (s *Service) Log() []Request {
	return append([]Request(nil), s.log...)
}

// Split dérive, de façon déterministe, le débit du payeur puis le crédit du bénéficiaire.
func Split(r Request) []Instruction {
	return []Instruction{
		{RequestID: r.ID, Account: r.From, Op: Debit, Amount: r.Amount},
		{RequestID: r.ID, Account: r.To, Op: Credit, Amount: r.Amount},
	}
}

// Shard tient les soldes des comptes d'une partition et applique chaque instruction une seule fois.
type Shard struct {
	balances map[string]int64
	applied  map[applyKey]bool
}

type applyKey struct {
	requestID, account string
	op                 Op
}

func NewShards(n int) []*Shard {
	shards := make([]*Shard, n)
	for i := range shards {
		shards[i] = &Shard{balances: make(map[string]int64), applied: make(map[applyKey]bool)}
	}
	return shards
}

// Apply applique in et renvoie true, ou renvoie false si cette instruction a déjà été appliquée.
func (sh *Shard) Apply(in Instruction) bool {
	key := applyKey{in.RequestID, in.Account, in.Op}
	if sh.applied[key] {
		return false
	}
	sh.applied[key] = true
	if in.Op == Debit {
		sh.balances[in.Account] -= in.Amount
	} else {
		sh.balances[in.Account] += in.Amount
	}
	return true
}

func (sh *Shard) Balance(account string) int64 { return sh.balances[account] }

// Deliver dérive les instructions de chaque requête du log, dans l'ordre, et les applique à la partition du compte.
// Relivrer un log (après une reprise) ne change rien.
func Deliver(shards []*Shard, log []Request) {
	for _, r := range log {
		for _, in := range Split(r) {
			shards[Partition(in.Account, len(shards))].Apply(in)
		}
	}
}

// ---------- Jalon 2 : premier arrivé dans le log ----------

// Claim est une demande de pseudo. (fourni)
type Claim struct {
	RequestID string
	Username  string
	UserID    string
}

// Outcome est la décision publiée sur le flux de sortie. (fourni)
type Outcome struct {
	RequestID string
	Username  string
	UserID    string
	OK        bool
}

// Normalize met un pseudo sous la forme qui définit un conflit : minuscules, sans espaces autour.
func Normalize(name string) string {
	return strings.ToLower(strings.TrimSpace(name))
}

// Registry impose l'unicité des pseudos avec un log partitionné par pseudo normalisé.
type Registry struct {
	parts [][]Claim
	next  []int
	owner []map[string]string
	done  []map[string]Outcome
}

func NewRegistry(n int) *Registry {
	r := &Registry{parts: make([][]Claim, n), next: make([]int, n), owner: make([]map[string]string, n), done: make([]map[string]Outcome, n)}
	for i := 0; i < n; i++ {
		r.owner[i] = make(map[string]string)
		r.done[i] = make(map[string]Outcome)
	}
	return r
}

// Append ajoute la demande à la partition de son pseudo normalisé et renvoie cette partition.
func (r *Registry) Append(c Claim) int {
	p := Partition(Normalize(c.Username), len(r.parts))
	r.parts[p] = append(r.parts[p], c)
	return p
}

// Process traite dans l'ordre les demandes de la partition p ajoutées depuis le dernier appel et renvoie les décisions.
func (r *Registry) Process(p int) []Outcome {
	var out []Outcome
	for ; r.next[p] < len(r.parts[p]); r.next[p]++ {
		c := r.parts[p][r.next[p]]
		if prev, ok := r.done[p][c.RequestID]; ok {
			out = append(out, prev)
			continue
		}
		name := Normalize(c.Username)
		owner, taken := r.owner[p][name]
		if !taken {
			r.owner[p][name] = c.UserID
		}
		o := Outcome{RequestID: c.RequestID, Username: name, UserID: c.UserID, OK: !taken || owner == c.UserID}
		r.done[p][c.RequestID] = o
		out = append(out, o)
	}
	return out
}

// Owner renvoie le propriétaire d'un pseudo, s'il est attribué.
func (r *Registry) Owner(username string) (string, bool) {
	name := Normalize(username)
	id, ok := r.owner[Partition(name, len(r.parts))][name]
	return id, ok
}

// ---------- Jalon 3 : faire confiance, mais vérifier ----------

// Discrepancy signale un compte dont le solde observé diffère du solde recalculé. (fourni)
type Discrepancy struct {
	Account  string
	Expected int64
	Got      int64
}

// Expected recalcule les soldes depuis le log, en ignorant les identifiants déjà vus.
func Expected(log []Request) map[string]int64 {
	out := make(map[string]int64)
	seen := make(map[string]bool)
	for _, r := range log {
		if seen[r.ID] {
			continue
		}
		seen[r.ID] = true
		out[r.From] -= r.Amount
		out[r.To] += r.Amount
	}
	return out
}

// Audit compare les soldes observés au recalcul et renvoie les écarts triés par compte (absent = 0).
func Audit(log []Request, observed map[string]int64) []Discrepancy {
	want := Expected(log)
	accounts := make(map[string]bool)
	for a := range want {
		accounts[a] = true
	}
	for a := range observed {
		accounts[a] = true
	}
	var out []Discrepancy
	for a := range accounts {
		if want[a] != observed[a] {
			out = append(out, Discrepancy{Account: a, Expected: want[a], Got: observed[a]})
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Account < out[j].Account })
	return out
}

// Collect rassemble les soldes de toutes les partitions.
func Collect(shards []*Shard) map[string]int64 {
	out := make(map[string]int64)
	for _, sh := range shards {
		for a, v := range sh.balances {
			out[a] += v
		}
	}
	return out
}
