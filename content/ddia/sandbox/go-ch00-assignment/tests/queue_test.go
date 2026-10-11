package lab

import (
	"math"
	"reflect"
	"testing"
)

func near(a, b float64) bool { return math.Abs(a-b) < 1e-9 }

// Une requête lente (100 ms) en troisième position, puis des requêtes de 5 ms toutes les 10 ms.
var (
	arrivals = []float64{0, 10, 20, 30, 40, 50}
	service  = []float64{5, 5, 100, 5, 5, 5}
)

func TestOpenLoopHeadOfLineBlocking(t *testing.T) {
	got := OpenLoop(arrivals, service)
	want := []float64{5, 5, 100, 95, 90, 85}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("OpenLoop = %v, attendu %v — une requête de 5 ms attend la fin de la requête lente qui la précède", got, want)
	}
}

func TestOpenLoopIdleServer(t *testing.T) {
	got := OpenLoop([]float64{0, 100}, []float64{10, 10})
	if !reflect.DeepEqual(got, []float64{10, 10}) {
		t.Errorf("serveur libre à l'arrivée : %v, attendu [10 10] — le serveur ne peut pas démarrer avant l'arrivée", got)
	}
}

func TestOpenLoopEdgeCases(t *testing.T) {
	if got := OpenLoop(nil, nil); len(got) != 0 {
		t.Errorf("sans requête : %v, attendu vide", got)
	}
	if got := OpenLoop([]float64{1, 2}, []float64{1}); got != nil {
		t.Errorf("longueurs différentes : %v, attendu nil", got)
	}
}

func TestClosedLoopHidesTheQueue(t *testing.T) {
	got := ClosedLoop(service)
	if !reflect.DeepEqual(got, service) {
		t.Errorf("ClosedLoop = %v, attendu %v", got, service)
	}
	got[0] = 999
	if service[0] == 999 {
		t.Error("ClosedLoop doit renvoyer une copie")
	}
	open, closed := Summarize(OpenLoop(arrivals, service)), Summarize(ClosedLoop(service))
	if open.P50 <= closed.P50 {
		t.Errorf("la médiane en boucle ouverte (%v) devrait dépasser celle en boucle fermée (%v) : c'est l'attente en file", open.P50, closed.P50)
	}
}

func TestSummarize(t *testing.T) {
	s := Summarize([]float64{5, 5, 100, 95, 90, 85})
	if !near(s.Mean, 380.0/6) || s.P50 != 85 || s.P95 != 100 || s.P99 != 100 || s.Max != 100 {
		t.Errorf("Summarize = %+v, attendu Mean=63.33 P50=85 P95=100 P99=100 Max=100", s)
	}
	if got := Summarize(nil); got != (Summary{}) {
		t.Errorf("Summarize(nil) = %+v, attendu le Summary nul", got)
	}
}

func TestSummarizeDoesNotMutate(t *testing.T) {
	in := []float64{3, 1, 2}
	Summarize(in)
	if !reflect.DeepEqual(in, []float64{3, 1, 2}) {
		t.Errorf("Summarize a modifié son entrée : %v", in)
	}
}

func TestSummarizeLargeSample(t *testing.T) {
	r := make([]float64, 1000)
	for i := range r {
		r[i] = float64(i + 1)
	}
	s := Summarize(r)
	if s.P50 != 500 || s.P95 != 950 || s.P99 != 990 || s.Max != 1000 || !near(s.Mean, 500.5) {
		t.Errorf("Summarize(1..1000) = %+v, attendu P50=500 P95=950 P99=990 Max=1000 Mean=500.5", s)
	}
}

func TestViolations(t *testing.T) {
	s := Summary{P50: 150, P99: 900}
	tests := []struct {
		slo  SLO
		want []string
	}{
		{SLO{P50: 200, P99: 1000}, []string{}},
		{SLO{P50: 100, P99: 1000}, []string{"p50"}},
		{SLO{P50: 200, P99: 500}, []string{"p99"}},
		{SLO{P50: 100, P99: 500}, []string{"p50", "p99"}},
		{SLO{P50: 150, P99: 900}, []string{}}, // à la limite : respecté
	}
	for _, tt := range tests {
		got := Violations(s, tt.slo)
		if got == nil || !reflect.DeepEqual(got, tt.want) {
			t.Errorf("Violations(%+v, %+v) = %#v, attendu %#v", s, tt.slo, got, tt.want)
		}
	}
}
