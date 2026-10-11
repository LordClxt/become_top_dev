package lab

import (
	"errors"
	"fmt"
	"hash/fnv"
	"sort"
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

// Partition choisit le reducer d'une clé : FNV-1a 32 bits, modulo n.
func Partition(key string, n int) int {
	h := fnv.New32a()
	h.Write([]byte(key))
	return int(h.Sum32() % uint32(n))
}

func identity(s string) string { return s }

// Run exécute le job : map, partition, tri stable par clé, regroupement, reduce.
func (j Job) Run() ([][]KV, error) {
	if j.Reducers < 1 {
		return nil, ErrNoReducers
	}
	if j.Reduce == nil {
		return nil, ErrNoFunc
	}
	part, group := j.PartitionKey, j.GroupKey
	if part == nil {
		part = identity
	}
	if group == nil {
		group = identity
	}

	buckets := make([][]KV, j.Reducers)
	for _, in := range j.Inputs {
		if in.Map == nil {
			return nil, ErrNoFunc
		}
		for _, rec := range in.Records {
			in.Map(rec, func(k, v string) {
				p := Partition(part(k), j.Reducers)
				buckets[p] = append(buckets[p], KV{Key: k, Value: v})
			})
		}
	}

	out := make([][]KV, j.Reducers)
	for p, b := range buckets {
		sort.SliceStable(b, func(x, y int) bool { return b[x].Key < b[y].Key })
		emit := func(k, v string) { out[p] = append(out[p], KV{Key: k, Value: v}) }
		for i := 0; i < len(b); {
			g := group(b[i].Key)
			var values []string
			for i < len(b) && group(b[i].Key) == g {
				values = append(values, b[i].Value)
				i++
			}
			j.Reduce(g, values, emit)
		}
	}
	return out, nil
}

// ---------- Jalon 2 : jointure sort-merge côté reduce ----------

const sep = "\x00"

func userPart(key string) string {
	id, _, _ := strings.Cut(key, sep)
	return id
}

func checkUnique(users []User) error {
	seen := make(map[string]bool, len(users))
	for _, u := range users {
		if seen[u.ID] {
			return fmt.Errorf("%w : %q", ErrDuplicateUser, u.ID)
		}
		seen[u.ID] = true
	}
	return nil
}

func encodeAll[T any](xs []T, enc func(T) string) []string {
	out := make([]string, len(xs))
	for i, x := range xs {
		out[i] = enc(x)
	}
	return out
}

func join(u User, e Event) Joined {
	return Joined{UserID: u.ID, Name: u.Name, BirthYear: u.BirthYear, At: e.At, URL: e.URL}
}

func sortJoined(rows []Joined) {
	sort.SliceStable(rows, func(i, k int) bool {
		if rows[i].UserID != rows[k].UserID {
			return rows[i].UserID < rows[k].UserID
		}
		return rows[i].At < rows[k].At
	})
}

// ReduceSideJoin joint chaque événement à son utilisateur (jointure interne) avec un job MapReduce.
func ReduceSideJoin(users []User, events []Event, reducers int) ([]Joined, error) {
	if err := checkUnique(users); err != nil {
		return nil, err
	}
	job := Job{
		Inputs: []Input{
			{Name: "users", Records: encodeAll(users, EncodeUser), Map: func(rec string, emit func(k, v string)) {
				emit(DecodeUser(rec).ID+sep+"0", "U"+rec)
			}},
			{Name: "events", Records: encodeAll(events, EncodeEvent), Map: func(rec string, emit func(k, v string)) {
				e := DecodeEvent(rec)
				emit(fmt.Sprintf("%s%s1%020d", e.UserID, sep, e.At), "E"+rec)
			}},
		},
		Reducers:     reducers,
		PartitionKey: userPart,
		GroupKey:     userPart,
		Reduce: func(id string, values []string, emit func(k, v string)) {
			if values[0][0] != 'U' {
				return // aucun utilisateur : la jointure interne laisse tomber ces événements
			}
			user := values[0][1:]
			for _, v := range values[1:] {
				emit(id, user+sep+v[1:])
			}
		},
	}
	parts, err := job.Run()
	if err != nil {
		return nil, err
	}
	var rows []Joined
	for _, p := range parts {
		for _, kv := range p {
			u, e, _ := strings.Cut(kv.Value, sep)
			rows = append(rows, join(DecodeUser(u), DecodeEvent(e)))
		}
	}
	sortJoined(rows)
	return rows, nil
}

// ---------- Jalon 3 : jointure côté map et déséquilibre ----------

// BroadcastHashJoin : chaque tâche map charge les utilisateurs dans une table de hachage et lit sa tranche
// contiguë d'événements. Pas de tri, pas de reducer. Sortie dans l'ordre des événements.
func BroadcastHashJoin(users []User, events []Event, mappers int) ([]Joined, error) {
	if mappers < 1 {
		return nil, ErrNoMappers
	}
	if err := checkUnique(users); err != nil {
		return nil, err
	}
	size := (len(events) + mappers - 1) / mappers
	var rows []Joined
	for t := 0; t < mappers; t++ {
		table := make(map[string]User, len(users))
		for _, u := range users {
			table[u.ID] = u
		}
		lo, hi := min(t*size, len(events)), min((t+1)*size, len(events))
		for _, e := range events[lo:hi] {
			if u, ok := table[e.UserID]; ok {
				rows = append(rows, join(u, e))
			}
		}
	}
	return rows, nil
}

// ReducerLoad compte combien d'événements chaque reducer recevrait si l'on partitionne par UserID.
func ReducerLoad(events []Event, reducers int) ([]int, error) {
	if reducers < 1 {
		return nil, ErrNoReducers
	}
	load := make([]int, reducers)
	for _, e := range events {
		load[Partition(e.UserID, reducers)]++
	}
	return load, nil
}
