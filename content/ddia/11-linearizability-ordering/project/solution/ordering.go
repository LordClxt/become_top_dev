package lab

import (
	"errors"
	"sort"
)

// ---------- Jalon 1 : horloges de Lamport ----------

// Timestamp est un horodatage de Lamport : un compteur et l'identifiant du nœud qui l'a produit. (fourni)
type Timestamp struct {
	Counter uint64
	Node    int
}

// Less ordonne totalement les horodatages : compteur d'abord, puis identifiant de nœud pour départager.
func (a Timestamp) Less(b Timestamp) bool {
	if a.Counter != b.Counter {
		return a.Counter < b.Counter
	}
	return a.Node < b.Node
}

// Clock est l'horloge de Lamport d'un nœud. (fourni)
type Clock struct {
	node    int
	counter uint64
}

// NewClock crée l'horloge du nœud node, compteur à 0. (fourni)
func NewClock(node int) *Clock { return &Clock{node: node} }

// Now renvoie l'horodatage courant sans avancer l'horloge.
func (c *Clock) Now() Timestamp { return Timestamp{Counter: c.counter, Node: c.node} }

// Tick marque un événement local ou un envoi : le compteur avance de 1.
func (c *Clock) Tick() Timestamp {
	c.counter++
	return c.Now()
}

// Observe marque la réception d'un message horodaté ts : le compteur saute à max(local, ts) + 1.
func (c *Clock) Observe(ts Timestamp) Timestamp {
	c.counter = max(c.counter, ts.Counter) + 1
	return c.Now()
}

// SortTimestamps trie ts dans l'ordre total de Lamport, sur place.
func SortTimestamps(ts []Timestamp) {
	sort.Slice(ts, func(i, j int) bool { return ts[i].Less(ts[j]) })
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
	for _, op := range history {
		if op.Start >= op.End || op.Kind < OpWrite || op.Kind > OpCAS {
			return nil, ErrBadOp
		}
	}
	done := make([]bool, len(history))
	order := make([]int, 0, len(history))
	if search(history, done, initial, &order) {
		return order, nil
	}
	return nil, ErrNotLinearizable
}

// search est un retour arrière : à chaque étape, on essaie chaque opération « minimale » (qu'aucune opération
// restante ne précède en temps réel) dont l'effet est cohérent avec l'état du registre.
func search(h []Op, done []bool, state int, order *[]int) bool {
	if len(*order) == len(h) {
		return true
	}
	for i, op := range h {
		if done[i] || !minimal(h, done, i) {
			continue
		}
		next, ok := apply(op, state)
		if !ok {
			continue
		}
		done[i] = true
		*order = append(*order, i)
		if search(h, done, next, order) {
			return true
		}
		done[i] = false
		*order = (*order)[:len(*order)-1]
	}
	return false
}

// minimal dit si aucune opération restante ne s'est terminée avant que h[i] commence.
func minimal(h []Op, done []bool, i int) bool {
	for j, other := range h {
		if j != i && !done[j] && other.End < h[i].Start {
			return false
		}
	}
	return true
}

// apply rejoue op sur le registre et dit si le résultat observé est possible.
func apply(op Op, state int) (int, bool) {
	switch op.Kind {
	case OpWrite:
		return op.Arg, true
	case OpRead:
		return state, op.Result == state
	case OpCAS:
		if state == op.Expect {
			return op.Arg, op.OK
		}
		return state, !op.OK
	}
	return state, false
}

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
	s.last++
	return Message{Seq: s.last, From: from, Payload: payload}
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
	if m.Seq < r.next {
		return nil
	}
	if _, dup := r.pending[m.Seq]; dup {
		return nil
	}
	r.pending[m.Seq] = m
	var out []Message
	for {
		msg, ok := r.pending[r.next]
		if !ok {
			break
		}
		delete(r.pending, r.next)
		r.delivered = append(r.delivered, msg)
		out = append(out, msg)
		r.next++
	}
	return out
}

// Delivered renvoie une copie de tous les messages livrés, dans l'ordre.
func (r *Replica) Delivered() []Message {
	return append([]Message(nil), r.delivered...)
}

// Owners rejoue des revendications de noms d'utilisateur (Payload = nom voulu, From = demandeur) :
// le premier dans l'ordre total gagne, les suivants sont refusés.
func Owners(log []Message) map[string]string {
	owners := make(map[string]string)
	for _, m := range log {
		if _, taken := owners[m.Payload]; !taken {
			owners[m.Payload] = m.From
		}
	}
	return owners
}
