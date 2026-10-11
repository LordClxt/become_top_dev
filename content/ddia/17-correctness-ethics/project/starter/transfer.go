package lab

import (
	"errors"
	"hash/fnv"
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
	seen map[string]int // identifiant → position dans le log
}

func NewService() *Service {
	return &Service{seen: make(map[string]int)}
}

// Submit ajoute r au log et renvoie sa position. Requête invalide (ID, From ou To vide, From == To, montant <= 0) :
// ErrInvalid. Une requête déjà vue (même ID, même contenu) renvoie la position d'origine avec dup = true, sans rien
// ajouter. Même ID et contenu différent : ErrIDReuse.
func (s *Service) Submit(r Request) (offset int, dup bool, err error) {
	// TODO
	return 0, false, errors.New("à implémenter")
}

// Log renvoie une COPIE du log.
func (s *Service) Log() []Request {
	// TODO
	return nil
}

// Split dérive, de façon déterministe, le débit du payeur puis le crédit du bénéficiaire, avec l'identifiant d'origine.
func Split(r Request) []Instruction {
	// TODO
	return nil
}

// Shard tient les soldes des comptes d'une partition et applique chaque instruction une seule fois.
type Shard struct {
	balances map[string]int64
	// TODO: de quoi se souvenir des instructions déjà appliquées
}

// NewShards crée n partitions vides.
func NewShards(n int) []*Shard {
	shards := make([]*Shard, n)
	for i := range shards {
		shards[i] = &Shard{balances: make(map[string]int64)}
	}
	return shards
}

// Apply applique in et renvoie true, ou renvoie false si cette instruction (même requête, même compte, même
// opération) a déjà été appliquée.
func (sh *Shard) Apply(in Instruction) bool {
	// TODO
	return false
}

func (sh *Shard) Balance(account string) int64 { return sh.balances[account] }

// Deliver dérive les instructions de chaque requête du log, dans l'ordre, et applique chacune à la partition
// Partition(compte, len(shards)). Relivrer un log (après une reprise) ne doit rien changer.
func Deliver(shards []*Shard, log []Request) {
	// TODO
}

// ---------- Jalon 2 : premier arrivé dans le log ----------

// Claim est une demande de pseudo. (fourni)
type Claim struct {
	RequestID string
	Username  string
	UserID    string
}

// Outcome est la décision publiée sur le flux de sortie (Username sous forme normalisée). (fourni)
type Outcome struct {
	RequestID string
	Username  string
	UserID    string
	OK        bool
}

// Normalize met un pseudo sous la forme qui définit un conflit : minuscules, sans espaces autour.
func Normalize(name string) string {
	// TODO
	return name
}

// Registry impose l'unicité des pseudos avec un log partitionné par pseudo normalisé.
type Registry struct {
	parts [][]Claim // le log, une slice par partition
	// TODO: position traitée, propriétaires et décisions déjà rendues, par partition
}

func NewRegistry(n int) *Registry {
	return &Registry{parts: make([][]Claim, n)}
}

// Append ajoute la demande à la partition de son pseudo normalisé et renvoie cette partition.
func (r *Registry) Append(c Claim) int {
	// TODO
	return 0
}

// Process traite DANS L'ORDRE les demandes de la partition p ajoutées depuis le dernier appel et renvoie les
// décisions. Pseudo libre : attribué, OK. Déjà pris par un autre : refus. Pris par le même utilisateur : OK.
// Une demande déjà décidée (même RequestID) reçoit la même décision qu'au premier passage.
func (r *Registry) Process(p int) []Outcome {
	// TODO
	return nil
}

// Owner renvoie le propriétaire d'un pseudo (quelle que soit sa casse), s'il est attribué.
func (r *Registry) Owner(username string) (string, bool) {
	// TODO
	return "", false
}

// ---------- Jalon 3 : faire confiance, mais vérifier ----------

// Discrepancy signale un compte dont le solde observé diffère du solde recalculé. (fourni)
type Discrepancy struct {
	Account  string
	Expected int64
	Got      int64
}

// Expected recalcule les soldes depuis le log (comptes à 0 au départ), en ne comptant qu'une fois chaque identifiant.
func Expected(log []Request) map[string]int64 {
	// TODO
	return nil
}

// Audit compare les soldes observés au recalcul et renvoie les écarts triés par compte. Un compte absent d'un
// côté vaut 0 de ce côté.
func Audit(log []Request, observed map[string]int64) []Discrepancy {
	// TODO
	return nil
}

// Collect rassemble les soldes de toutes les partitions.
func Collect(shards []*Shard) map[string]int64 {
	// TODO
	return nil
}
