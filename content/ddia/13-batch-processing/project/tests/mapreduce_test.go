package lab

import (
	"errors"
	"hash/fnv"
	"reflect"
	"sort"
	"strconv"
	"strings"
	"testing"
)

// ---------- Jalon 1 : le moteur ----------

func wordCount(lines []string, reducers int) Job {
	return Job{
		Inputs: []Input{{Name: "logs", Records: lines, Map: func(rec string, emit func(k, v string)) {
			for _, w := range strings.Fields(rec) {
				emit(w, "1")
			}
		}}},
		Reducers: reducers,
		Reduce: func(key string, values []string, emit func(k, v string)) {
			emit(key, strconv.Itoa(len(values)))
		},
	}
}

func TestM1Partition(t *testing.T) {
	for _, key := range []string{"", "a", "/home", "user-42", "émoji"} {
		for _, n := range []int{1, 3, 8} {
			h := fnv.New32a()
			h.Write([]byte(key))
			want := int(h.Sum32() % uint32(n))
			if got := Partition(key, n); got != want {
				t.Errorf("Partition(%q, %d) = %d, attendu %d — FNV-1a 32 bits (hash/fnv) modulo n", key, n, got, want)
			}
		}
	}
}

func TestM1WordCount(t *testing.T) {
	lines := []string{"/home /about /home", "/cart /home", "", "/about"}
	parts, err := wordCount(lines, 3).Run()
	if err != nil {
		t.Fatal(err)
	}
	if len(parts) != 3 {
		t.Fatalf("Run() renvoie %d partitions, attendu 3 — une sortie par reducer", len(parts))
	}
	got := map[string]string{}
	for p, part := range parts {
		for i, kv := range part {
			if Partition(kv.Key, 3) != p {
				t.Errorf("la clé %q est sortie du reducer %d, attendu %d — partitionne avec Partition(clé, Reducers)", kv.Key, p, Partition(kv.Key, 3))
			}
			if i > 0 && part[i-1].Key >= kv.Key {
				t.Errorf("reducer %d : %q avant %q — chaque reducer voit ses clés triées, une seule fois chacune", p, part[i-1].Key, kv.Key)
			}
			got[kv.Key] = kv.Value
		}
	}
	want := map[string]string{"/home": "3", "/about": "2", "/cart": "1"}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("comptage = %v, attendu %v — Reduce doit recevoir toutes les valeurs d'une clé d'un coup", got, want)
	}
}

func TestM1ValuesKeepEmissionOrder(t *testing.T) {
	job := Job{
		Inputs: []Input{
			{Name: "a", Records: []string{"k=1", "k=2"}, Map: func(rec string, emit func(k, v string)) {
				k, v, _ := strings.Cut(rec, "=")
				emit(k, v)
			}},
			{Name: "b", Records: []string{"k=3"}, Map: func(rec string, emit func(k, v string)) {
				k, v, _ := strings.Cut(rec, "=")
				emit(k, v)
			}},
		},
		Reducers: 2,
		Reduce: func(key string, values []string, emit func(k, v string)) {
			emit(key, strings.Join(values, ","))
		},
	}
	parts, err := job.Run()
	if err != nil {
		t.Fatal(err)
	}
	p := Partition("k", 2)
	if len(parts[p]) != 1 || parts[p][0].Value != "1,2,3" {
		t.Errorf("valeurs reçues = %v, attendu [{k 1,2,3}] — tri STABLE : à clé égale, l'ordre d'émission (entrées dans l'ordre) est conservé", parts[p])
	}
}

func TestM1Errors(t *testing.T) {
	if _, err := wordCount(nil, 0).Run(); !errors.Is(err, ErrNoReducers) {
		t.Errorf("Reducers = 0 : err = %v, attendu ErrNoReducers", err)
	}
	j := wordCount(nil, 2)
	j.Reduce = nil
	if _, err := j.Run(); !errors.Is(err, ErrNoFunc) {
		t.Errorf("Reduce nil : err = %v, attendu ErrNoFunc", err)
	}
	j = wordCount([]string{"x"}, 2)
	j.Inputs[0].Map = nil
	if _, err := j.Run(); !errors.Is(err, ErrNoFunc) {
		t.Errorf("Map nil : err = %v, attendu ErrNoFunc", err)
	}
}

// ---------- Jalon 2 : jointure sort-merge côté reduce ----------

func TestM2SecondarySort(t *testing.T) {
	prefix := func(k string) string { a, _, _ := strings.Cut(k, "|"); return a }
	var calls []string
	job := Job{
		Inputs: []Input{{Name: "in", Records: []string{"u1|c", "u2|b", "u1|a", "u1|b"}, Map: func(rec string, emit func(k, v string)) {
			emit(rec, rec)
		}}},
		Reducers:     4,
		PartitionKey: prefix,
		GroupKey:     prefix,
		Reduce: func(key string, values []string, emit func(k, v string)) {
			calls = append(calls, key)
			emit(key, strings.Join(values, " "))
		},
	}
	parts, err := job.Run()
	if err != nil {
		t.Fatal(err)
	}
	sort.Strings(calls)
	if !reflect.DeepEqual(calls, []string{"u1", "u2"}) {
		t.Fatalf("Reduce appelé pour %v, attendu [u1 u2] — un appel par valeur de GroupKey, pas par clé complète", calls)
	}
	p := Partition("u1", 4)
	if len(parts[p]) == 0 || parts[p][0] != (KV{"u1", "u1|a u1|b u1|c"}) {
		t.Errorf("reducer %d = %v, attendu {u1 \"u1|a u1|b u1|c\"} en tête — partitionne par PartitionKey, trie par la clé complète (tri secondaire)", p, parts[p])
	}
}

func fixture() ([]User, []Event) {
	users := []User{{"u1", "Ada", 1990}, {"u2", "Linus", 1969}, {"u3", "Grace", 1906}, {"u9", "Sans clic", 2000}}
	events := []Event{
		{"u2", 300, "/cart"}, {"u1", 200, "/home"}, {"u4", 100, "/ghost"}, {"u1", 100, "/login"},
		{"u3", 500, "/docs"}, {"u2", 300, "/pay"}, {"u1", 150, "/search"}, {"u2", 50, "/home"},
	}
	return users, events
}

var wantJoin = []Joined{
	{"u1", "Ada", 1990, 100, "/login"}, {"u1", "Ada", 1990, 150, "/search"}, {"u1", "Ada", 1990, 200, "/home"},
	{"u2", "Linus", 1969, 50, "/home"}, {"u2", "Linus", 1969, 300, "/cart"}, {"u2", "Linus", 1969, 300, "/pay"},
	{"u3", "Grace", 1906, 500, "/docs"},
}

func TestM2ReduceSideJoin(t *testing.T) {
	users, events := fixture()
	for _, r := range []int{1, 2, 5} {
		got, err := ReduceSideJoin(users, events, r)
		if err != nil {
			t.Fatalf("ReduceSideJoin(%d reducers) : %v", r, err)
		}
		if !reflect.DeepEqual(got, wantJoin) {
			t.Errorf("ReduceSideJoin(%d reducers) =\n%v\nattendu\n%v\n— jointure interne (u4 sans profil disparaît, u9 sans clic aussi), triée par UserID puis At ; à égalité, l'ordre d'entrée", r, got, wantJoin)
		}
	}
}

func TestM2Errors(t *testing.T) {
	users := []User{{"u1", "Ada", 1990}, {"u1", "Ada bis", 1991}}
	if _, err := ReduceSideJoin(users, nil, 2); !errors.Is(err, ErrDuplicateUser) {
		t.Errorf("deux profils u1 : err = %v, attendu ErrDuplicateUser — une jointure suppose une clé unique côté utilisateurs", err)
	}
	if _, err := ReduceSideJoin(nil, nil, 0); !errors.Is(err, ErrNoReducers) {
		t.Errorf("0 reducer : err = %v, attendu ErrNoReducers", err)
	}
	got, err := ReduceSideJoin(nil, nil, 3)
	if err != nil || len(got) != 0 {
		t.Errorf("entrées vides : %v, %v ; attendu aucune ligne, pas d'erreur", got, err)
	}
}

// ---------- Jalon 3 : jointure côté map et déséquilibre ----------

func TestM3BroadcastHashJoin(t *testing.T) {
	users, events := fixture()
	want := []Joined{
		{"u2", "Linus", 1969, 300, "/cart"}, {"u1", "Ada", 1990, 200, "/home"}, {"u1", "Ada", 1990, 100, "/login"},
		{"u3", "Grace", 1906, 500, "/docs"}, {"u2", "Linus", 1969, 300, "/pay"}, {"u1", "Ada", 1990, 150, "/search"},
		{"u2", "Linus", 1969, 50, "/home"},
	}
	for _, m := range []int{1, 3, 8, 20} {
		got, err := BroadcastHashJoin(users, events, m)
		if err != nil {
			t.Fatalf("BroadcastHashJoin(%d tâches) : %v", m, err)
		}
		if !reflect.DeepEqual(got, want) {
			t.Errorf("BroadcastHashJoin(%d tâches) =\n%v\nattendu\n%v\n— pas de tri : la sortie suit l'ordre des événements, tranche après tranche", m, got, want)
		}
	}
	if _, err := BroadcastHashJoin(users, events, 0); !errors.Is(err, ErrNoMappers) {
		t.Errorf("0 tâche map : err = %v, attendu ErrNoMappers", err)
	}
	if _, err := BroadcastHashJoin([]User{{"u1", "a", 1}, {"u1", "b", 2}}, events, 2); !errors.Is(err, ErrDuplicateUser) {
		t.Errorf("profils en double : err = %v, attendu ErrDuplicateUser", err)
	}
}

func TestM3SameResultDeterministic(t *testing.T) {
	users, events := fixture()
	for i := 0; i < 40; i++ {
		events = append(events, Event{UserID: "u" + strconv.Itoa(i%5), At: int64(1000 + i%7), URL: "/p" + strconv.Itoa(i)})
	}
	ref, err := ReduceSideJoin(users, events, 1)
	if err != nil {
		t.Fatal(err)
	}
	for run := 0; run < 5; run++ {
		for _, r := range []int{2, 3, 7} {
			got, _ := ReduceSideJoin(users, events, r)
			if !reflect.DeepEqual(got, ref) {
				t.Fatalf("ReduceSideJoin varie avec %d reducers (essai %d) — un job déterministe ne dépend ni du nombre de tâches ni de l'ordre d'une map Go", r, run)
			}
		}
		bc, _ := BroadcastHashJoin(users, events, 4)
		sort.SliceStable(bc, func(i, k int) bool {
			if bc[i].UserID != bc[k].UserID {
				return bc[i].UserID < bc[k].UserID
			}
			return bc[i].At < bc[k].At
		})
		if !reflect.DeepEqual(bc, ref) {
			t.Fatalf("une fois triée, la jointure côté map diffère de la jointure côté reduce :\n%v\n%v\n— deux algorithmes, un seul résultat", bc, ref)
		}
	}
}

func TestM3ReducerLoad(t *testing.T) {
	var events []Event
	for i := 0; i < 90; i++ {
		events = append(events, Event{UserID: "celebrite", At: int64(i), URL: "/"})
	}
	for i := 0; i < 10; i++ {
		events = append(events, Event{UserID: "u" + strconv.Itoa(i), At: int64(i), URL: "/"})
	}
	load, err := ReducerLoad(events, 4)
	if err != nil {
		t.Fatal(err)
	}
	want := make([]int, 4)
	for _, e := range events {
		want[Partition(e.UserID, 4)]++
	}
	if !reflect.DeepEqual(load, want) {
		t.Errorf("ReducerLoad = %v, attendu %v — compte les événements par Partition(UserID, reducers)", load, want)
	}
	if load[Partition("celebrite", 4)] < 90 {
		t.Errorf("le reducer de la clé chaude reçoit %d événements, au moins 90 attendus — c'est le déséquilibre (skew)", load[Partition("celebrite", 4)])
	}
	if _, err := ReducerLoad(events, 0); !errors.Is(err, ErrNoReducers) {
		t.Errorf("0 reducer : err = %v, attendu ErrNoReducers", err)
	}
}
