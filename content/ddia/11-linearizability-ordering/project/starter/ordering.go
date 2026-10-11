package lab

import "errors"

// ---------- Jalon 1 : horloges de Lamport ----------

// Timestamp est un horodatage de Lamport : un compteur et l'identifiant du nœud qui l'a produit. (fourni)
type Timestamp struct {
	Counter uint64
	Node    int
}

// Less ordonne totalement les horodatages : compteur d'abord, puis identifiant de nœud pour départager.
func (a Timestamp) Less(b Timestamp) bool {
	// TODO: compare Counter, puis Node pour départager
	return false
}

// Clock est l'horloge de Lamport d'un nœud. (fourni)
type Clock struct {
	node    int
	counter uint64
}

// NewClock crée l'horloge du nœud node, compteur à 0. (fourni)
func NewClock(node int) *Clock { return &Clock{node: node} }

// Now renvoie l'horodatage courant sans avancer l'horloge.
func (c *Clock) Now() Timestamp {
	// TODO
	return Timestamp{}
}

// Tick marque un événement local ou un envoi : le compteur avance de 1.
func (c *Clock) Tick() Timestamp {
	// TODO: avancer le compteur de 1
	return Timestamp{}
}

// Observe marque la réception d'un message horodaté ts : le compteur saute à max(local, ts) + 1.
func (c *Clock) Observe(ts Timestamp) Timestamp {
	// TODO: compteur = max(local, ts.Counter) + 1
	return Timestamp{}
}

// SortTimestamps trie ts dans l'ordre total de Lamport, sur place.
func SortTimestamps(ts []Timestamp) {
	// TODO: trier avec Less
}

// ---------- Jalon 2 : vérifier la linéarisabilité d'un registre ----------

// OpKind est la nature d'une opération sur le registre. (fourni)
type OpKind int

const (
	OpWrite OpKind = iota // écrit Arg
	OpRead                // a lu Result
	OpCAS                 // si valeur == Expect alors valeur = Arg ; OK dit si ça a réussi
)

// Op est une opération observée par un client, entre l'envoi (Start) et la réponse (End). (fourni)
type Op struct {
	Client string
	Kind   OpKind
	Arg    int
	Expect int
	Result int
	OK     bool
	Start  int
	End    int
}

// Erreurs à renvoyer. (fournies)
var (
	ErrNotLinearizable = errors.New("aucun ordre total compatible avec le temps réel n'explique cet historique")
	ErrBadOp           = errors.New("opération invalide (Start doit précéder End, Kind connu)")
)

// Linearize cherche un ordre des opérations qui (1) respecte le temps réel — si a.End < b.Start, a vient avant b —
// et (2) rejoue correctement un registre partant de initial. Il renvoie les indices dans cet ordre.
func Linearize(initial int, history []Op) ([]int, error) {
	// TODO: valider les opérations, puis chercher un ordre par retour arrière
	return nil, errors.New("à implémenter")
}

// Conseil : écris une fonction récursive de retour arrière. À chaque étape, une opération est candidate si
// aucune opération restante ne s'est terminée avant son début ; rejoue-la sur le registre, puis descends.

// ---------- Jalon 3 : diffusion à ordre total par séquenceur ----------

// Message est un message diffusé, numéroté par le séquenceur à partir de 1. (fourni)
type Message struct {
	Seq     uint64
	From    string
	Payload string
}

// Sequencer attribue des numéros de séquence consécutifs. (fourni)
type Sequencer struct{ last uint64 }

// Assign numérote un message : 1, 2, 3…
func (s *Sequencer) Assign(from, payload string) Message {
	// TODO
	return Message{}
}

// Replica reçoit les messages dans n'importe quel ordre et les livre dans l'ordre des numéros, sans trou.
type Replica struct {
	next      uint64
	pending   map[uint64]Message
	delivered []Message
}

// NewReplica crée une réplique qui attend le message 1. (fourni)
func NewReplica() *Replica {
	return &Replica{next: 1, pending: map[uint64]Message{}}
}

// Receive met m en attente puis livre tout ce qui devient contigu ; renvoie les messages livrés par cet appel.
// Un doublon ou un numéro déjà livré (ou 0) est ignoré.
func (r *Replica) Receive(m Message) []Message {
	// TODO: ignorer doublons et numéros déjà livrés, mettre en attente, livrer ce qui est contigu
	return nil
}

// Delivered renvoie une copie de tous les messages livrés, dans l'ordre.
func (r *Replica) Delivered() []Message {
	// TODO: renvoyer une copie
	return nil
}

// Owners rejoue des revendications de noms d'utilisateur (Payload = nom voulu, From = demandeur) :
// le premier dans l'ordre total gagne, les suivants sont refusés.
func Owners(log []Message) map[string]string {
	// TODO: le premier dans l'ordre gagne
	return nil
}
