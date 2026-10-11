package lab

import (
	"errors"
	"strconv"
	"strings"
)

// ---------- Types et utilitaires fournis ----------

// KV est une paire clé-valeur émise par un mapper ou un reducer. (fourni)
type KV struct {
	Key   string
	Value string
}

// MapFunc est appelée une fois par enregistrement d'entrée et émet des paires. (fourni)
type MapFunc func(record string, emit func(key, value string))

// ReduceFunc est appelée une fois par groupe, avec les valeurs du groupe dans l'ordre trié des clés. (fourni)
type ReduceFunc func(key string, values []string, emit func(key, value string))

// Input est une entrée du job : des enregistrements et le mapper qui les lit. (fourni)
type Input struct {
	Name    string
	Records []string
	Map     MapFunc
}

// Job décrit un job MapReduce. (fourni)
//   - PartitionKey : partie de la clé qui choisit le reducer (nil = la clé entière).
//   - GroupKey : partie de la clé qui définit un groupe passé à Reduce (nil = la clé entière).
//     Les clés d'un même groupe doivent être contiguës une fois triées (en pratique : un préfixe).
type Job struct {
	Inputs       []Input
	Reduce       ReduceFunc
	Reducers     int
	PartitionKey func(key string) string
	GroupKey     func(key string) string
}

// User et Event sont les deux entrées de la jointure. Event.At est un horodatage Unix positif. (fournis)
type User struct {
	ID        string
	Name      string
	BirthYear int
}

type Event struct {
	UserID string
	At     int64
	URL    string
}

// Joined est une ligne de sortie de la jointure : un événement enrichi de son utilisateur. (fourni)
type Joined struct {
	UserID    string
	Name      string
	BirthYear int
	At        int64
	URL       string
}

// Erreurs à renvoyer. (fournies)
var (
	ErrNoReducers    = errors.New("il faut au moins un reducer")
	ErrNoMappers     = errors.New("il faut au moins une tâche map")
	ErrNoFunc        = errors.New("fonction map ou reduce manquante")
	ErrDuplicateUser = errors.New("identifiant d'utilisateur en double")
)

// Encodage texte des enregistrements, comme des lignes d'un fichier HDFS (champs séparés par une tabulation). (fourni)
func EncodeUser(u User) string {
	return strings.Join([]string{u.ID, u.Name, strconv.Itoa(u.BirthYear)}, "\t")
}

func DecodeUser(s string) User {
	f := strings.Split(s, "\t")
	y, _ := strconv.Atoi(f[2])
	return User{ID: f[0], Name: f[1], BirthYear: y}
}

func EncodeEvent(e Event) string {
	return strings.Join([]string{e.UserID, strconv.FormatInt(e.At, 10), e.URL}, "\t")
}

func DecodeEvent(s string) Event {
	f := strings.Split(s, "\t")
	at, _ := strconv.ParseInt(f[1], 10, 64)
	return Event{UserID: f[0], At: at, URL: f[2]}
}

// ---------- Jalon 1 : le moteur ----------

// Partition choisit le reducer d'une clé : FNV-1a 32 bits (hash/fnv), modulo n.
func Partition(key string, n int) int {
	// TODO
	return 0
}

// Run exécute le job : appelle chaque Map sur chacun de ses enregistrements, range chaque paire émise dans la
// partition Partition(PartitionKey(clé), Reducers), trie chaque partition par clé complète (tri STABLE), puis appelle
// Reduce une fois par groupe consécutif de même GroupKey. Renvoie une sortie par reducer (len = Reducers).
// Reducers < 1 : ErrNoReducers. Reduce ou un Map nil : ErrNoFunc.
func (j Job) Run() ([][]KV, error) {
	// TODO
	return nil, errors.New("à implémenter")
}

// ---------- Jalon 2 : jointure sort-merge côté reduce ----------

// ReduceSideJoin joint chaque événement à son utilisateur (jointure interne) avec un job MapReduce à deux entrées.
// Clé = UserID + un suffixe qui place le profil AVANT les événements, eux-mêmes triés par At (tri secondaire) ;
// partition et groupe sur le seul UserID. Résultat trié par UserID puis At (à égalité : l'ordre d'entrée).
// Profils en double : ErrDuplicateUser. Reducers < 1 : ErrNoReducers.
func ReduceSideJoin(users []User, events []Event, reducers int) ([]Joined, error) {
	// TODO
	return nil, errors.New("à implémenter")
}

// ---------- Jalon 3 : jointure côté map et déséquilibre ----------

// BroadcastHashJoin : jointure côté map, sans tri ni reducer. Les événements sont découpés en `mappers` tranches
// contiguës de taille ceil(len/mappers) ; chaque tâche charge les utilisateurs dans une table de hachage puis lit sa
// tranche. Sortie dans l'ordre des événements. mappers < 1 : ErrNoMappers. Profils en double : ErrDuplicateUser.
func BroadcastHashJoin(users []User, events []Event, mappers int) ([]Joined, error) {
	// TODO
	return nil, errors.New("à implémenter")
}

// ReducerLoad compte combien d'événements chaque reducer recevrait si l'on partitionne par UserID.
// reducers < 1 : ErrNoReducers.
func ReducerLoad(events []Event, reducers int) ([]int, error) {
	// TODO
	return nil, errors.New("à implémenter")
}
