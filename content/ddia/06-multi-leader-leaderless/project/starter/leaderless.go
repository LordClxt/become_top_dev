package lab

import (
	"errors"
	"sort"
)

// VersionVector associe à chaque réplica le plus grand numéro de version vu pour lui. Absent = 0. (fourni)
type VersionVector map[string]uint64

// Ordering est le résultat de la comparaison de deux vecteurs. (fourni)
type Ordering int

const (
	Equal      Ordering = iota // mêmes compteurs partout
	Before                     // a s'est produit avant b (b connaît tout ce que connaît a, et plus)
	After                      // a s'est produit après b
	Concurrent                 // aucun des deux ne connaît tout l'autre
)

func (o Ordering) String() string {
	return [...]string{"Equal", "Before", "After", "Concurrent"}[o]
}

// Version est une valeur écrite par un client. (fourni)
// Node et Seq identifient l'écriture : le réplica coordinateur et son compteur au moment de l'écriture.
// Seen est le contexte envoyé par le client : le vecteur de ce qu'il avait lu avant d'écrire.
type Version struct {
	Value string
	Node  string
	Seq   uint64
	Seen  VersionVector
}

// Erreurs à renvoyer (enveloppées avec %w si tu ajoutes du contexte). (fournies)
var (
	ErrConfig   = errors.New("configuration invalide")
	ErrNoQuorum = errors.New("quorum non atteint")
	ErrUnknown  = errors.New("réplica inconnu")
)

// Replica est un nœud de stockage sans leader. (fourni)
type Replica struct {
	ID      string
	down    bool
	counter uint64
	data    map[string][]Version
}

// Cluster regroupe n réplicas, dans un ordre fixe, avec des quorums w et r. (fourni)
type Cluster struct {
	replicas []*Replica
	w, r     int
}

// Result est la réponse d'une lecture. (fourni)
// Context est la fusion des vecteurs (Clock) de tous les siblings renvoyés.
type Result struct {
	Values  []string      // les siblings, triés par ordre alphabétique ; vide si la clé n'existe pas
	Context VersionVector // à renvoyer dans le prochain Put pour écraser ces siblings
}

// Local renvoie les valeurs stockées sur un réplica, triées, sans passer par un quorum. Sert aux tests. (fourni)
func (c *Cluster) Local(id, key string) []string {
	for _, rep := range c.replicas {
		if rep.ID == id {
			return values(rep.data[key])
		}
	}
	return nil
}

func values(vs []Version) []string {
	out := make([]string, 0, len(vs))
	for _, v := range vs {
		out = append(out, v.Value)
	}
	sort.Strings(out)
	return out
}

// ---------- Jalon 1 : vecteurs de versions ----------

// Compare situe a par rapport à b : Equal, Before (b connaît tout ce que connaît a, et plus), After ou Concurrent.
// Une entrée absente vaut 0 ; nil se comporte comme un vecteur vide.
func Compare(a, b VersionVector) Ordering {
	// TODO: parcourir les entrées des DEUX vecteurs ; noter si a est en retard quelque part, et si b l'est
	return Equal
}

// Merge renvoie un nouveau vecteur : le maximum, entrée par entrée. Ni a ni b ne sont modifiés. Jamais nil.
func Merge(a, b VersionVector) VersionVector {
	// TODO
	return nil
}

// Clock est le vecteur complet de la version : son contexte (Seen) plus sa propre écriture (Node, Seq).
// Seen n'est pas modifié.
func (v Version) Clock() VersionVector {
	// TODO
	return nil
}

// SupersededBy dit si o remplace v : l'écrivain de o avait vu l'écriture de v (o.Seen couvre Node/Seq de v).
func (v Version) SupersededBy(o Version) bool {
	// TODO
	return false
}

// Prune garde les siblings : sans doublon (même Node et Seq), sans version remplacée par une autre,
// triés par Node puis Seq. Jamais nil.
func Prune(vs []Version) []Version {
	// TODO
	return nil
}

// ---------- Jalon 2 : quorums et read repair ----------

// NewCluster crée n réplicas (n = len(ids), dans cet ordre) avec des quorums w et r.
// ErrConfig si n = 0, si w ou r sort de [1, n], ou si un identifiant est vide ou en double.
func NewCluster(ids []string, w, r int) (*Cluster, error) {
	// TODO
	return nil, errors.New("à implémenter")
}

// SetDown rend un réplica injoignable (true) ou le rétablit (false). Identifiant inconnu : ErrUnknown.
func (c *Cluster) SetDown(id string, down bool) error {
	// TODO
	return errors.New("à implémenter")
}

// Put écrit value avec le contexte ctx (le Context d'une lecture précédente, ou nil).
// Le premier réplica disponible coordonne : il incrémente son compteur et fabrique la version
// {Node: son ID, Seq: son compteur, Seen: copie de ctx}. La version est envoyée à TOUS les réplicas disponibles,
// chacun la fusionne avec ce qu'il a (Prune). Moins de w réplicas disponibles : ErrNoQuorum, sans retour arrière.
// Renvoie le Clock de la nouvelle version.
func (c *Cluster) Put(key, value string, ctx VersionVector) (VersionVector, error) {
	// TODO
	return nil, errors.New("à implémenter")
}

// Get interroge exactement les r premiers réplicas disponibles (ordre du cluster) ; moins de r disponibles :
// ErrNoQuorum. Il fusionne leurs versions (Prune), répare chaque réplica interrogé (read repair) et renvoie
// les valeurs triées avec le contexte (fusion des Clock des siblings, vide mais non nil si la clé est absente).
func (c *Cluster) Get(key string) (Result, error) {
	// TODO
	return Result{}, errors.New("à implémenter")
}

// ---------- Jalon 3 : siblings, fusion, anti-entropie ----------

// UnionMerge fusionne des siblings de panier : chaque valeur est une liste d'articles séparés par des virgules.
// Résultat : l'union, sans doublon ni article vide (espaces retirés), triée, jointe par des virgules.
func UnionMerge(siblings []string) string {
	// TODO
	return ""
}

// AntiEntropy aligne tous les réplicas disponibles, clé par clé (chacun reçoit la fusion de tous),
// et renvoie le nombre de couples (réplica, clé) qui ont changé.
func (c *Cluster) AntiEntropy() int {
	// TODO
	return 0
}
