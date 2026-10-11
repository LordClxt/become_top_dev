package lab

import (
	"reflect"
	"strings"
	"testing"
	"time"
)

func d(s string) time.Time {
	t, err := time.Parse("2006-01-02 15:04", s)
	if err != nil {
		panic(err)
	}
	return t
}

func observations() []Observation {
	return []Observation{
		{d("1995-12-25 12:34"), "Sharks", "Carcharodon carcharias", 3},
		{d("1995-12-12 16:17"), "Sharks", "Carcharias taurus", 4},
		{d("1996-01-02 08:00"), "Sharks", "Carcharodon carcharias", 2},
		{d("1995-12-30 10:00"), "Whales", "Balaenoptera musculus", 9},
		{d("1995-12-31 23:59"), "Sharks", "Carcharias taurus", 1},
	}
}

func TestMapReduceCallsMapOncePerDocAndReduceOncePerKey(t *testing.T) {
	mapCalls, reduceCalls := 0, 0
	out := MapReduce([]string{"a b", "b c", "c"},
		func(doc string, emit func(string, int)) {
			mapCalls++
			for _, w := range strings.Fields(doc) {
				emit(w, 1)
			}
		},
		func(_ string, values []int) int {
			reduceCalls++
			return len(values)
		})
	want := map[string]int{"a": 1, "b": 2, "c": 2}
	if !reflect.DeepEqual(out, want) {
		t.Errorf("MapReduce = %v, attendu %v", out, want)
	}
	if mapCalls != 3 || reduceCalls != 3 {
		t.Errorf("map appelée %d fois (attendu 3), reduce %d fois (attendu 3, une par clé)", mapCalls, reduceCalls)
	}
}

func TestMapReduceKeepsEmissionOrder(t *testing.T) {
	out := MapReduce([]int{1, 2, 3},
		func(n int, emit func(string, int)) { emit("k", n) },
		func(_ string, values []int) []int { return values })
	if !reflect.DeepEqual(out["k"], []int{1, 2, 3}) {
		t.Errorf("valeurs reçues par reduce = %v, attendu [1 2 3] dans l'ordre d'émission", out["k"])
	}
}

func TestMapReduceEdgeCases(t *testing.T) {
	out := MapReduce([]int(nil),
		func(int, func(string, int)) { t.Error("map ne doit pas être appelée sans document") },
		func(string, []int) int { t.Error("reduce ne doit pas être appelée sans clé"); return 0 })
	if out == nil || len(out) != 0 {
		t.Errorf("sans document : %#v, attendu une map vide non nil", out)
	}
	// Un document peut émettre plusieurs clés, ou aucune.
	out2 := MapReduce([]int{0, 3},
		func(n int, emit func(string, int)) {
			for i := 0; i < n; i++ {
				emit("x", 1)
			}
		},
		func(_ string, v []int) int { return len(v) })
	if !reflect.DeepEqual(out2, map[string]int{"x": 3}) {
		t.Errorf("émissions multiples ou nulles : %v", out2)
	}
}

func TestMatchAndGroupSum(t *testing.T) {
	obs := observations()
	sharks := Match(obs, func(o Observation) bool { return o.Family == "Sharks" })
	if len(sharks) != 4 || sharks[0].NumAnimals != 3 || sharks[3].NumAnimals != 1 {
		t.Errorf("Match = %+v, attendu 4 requins dans l'ordre", sharks)
	}
	if len(obs) != 5 {
		t.Error("Match ne doit pas modifier l'entrée")
	}
	if got := Match(obs, func(Observation) bool { return false }); len(got) != 0 {
		t.Errorf("aucun résultat attendu : %v", got)
	}
	sums := GroupSum(sharks, func(o Observation) string { return o.Species }, func(o Observation) int { return o.NumAnimals })
	if !reflect.DeepEqual(sums, map[string]int{"Carcharodon carcharias": 5, "Carcharias taurus": 5}) {
		t.Errorf("GroupSum = %v", sums)
	}
}

func TestMonthlyTotalsAgree(t *testing.T) {
	want := map[string]int{"1995-12": 8, "1996-01": 2}
	if got := MonthlyTotalsMR(observations(), "Sharks"); !reflect.DeepEqual(got, want) {
		t.Errorf("MonthlyTotalsMR = %v, attendu %v", got, want)
	}
	if got := MonthlyTotalsPipeline(observations(), "Sharks"); !reflect.DeepEqual(got, want) {
		t.Errorf("MonthlyTotalsPipeline = %v, attendu %v", got, want)
	}
	if got := MonthlyTotalsMR(observations(), "Dolphins"); len(got) != 0 {
		t.Errorf("famille absente : %v", got)
	}
}

func TestMonthUsesUTC(t *testing.T) {
	paris := time.FixedZone("CET", 3600)
	obs := []Observation{{time.Date(1996, 1, 1, 0, 30, 0, 0, paris), "Sharks", "x", 5}} // 31 déc. 23:30 UTC
	if got := MonthlyTotalsMR(obs, "Sharks"); !reflect.DeepEqual(got, map[string]int{"1995-12": 5}) {
		t.Errorf("le mois se lit en UTC : %v", got)
	}
}
