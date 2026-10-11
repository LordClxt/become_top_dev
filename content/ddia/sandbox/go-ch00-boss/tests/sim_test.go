package lab

import (
	"math"
	"reflect"
	"testing"
)

func steady(n int, every, svc float64) (arrivals, service []float64) {
	for i := 0; i < n; i++ {
		arrivals = append(arrivals, float64(i)*every)
		service = append(service, svc)
	}
	return
}

func TestRunSingleWorkerQueues(t *testing.T) {
	got := Run([]float64{0, 10, 20, 30, 40, 50}, []float64{5, 5, 100, 5, 5, 5}, 1)
	want := []float64{5, 5, 100, 95, 90, 85}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("Run(1 worker) = %v, attendu %v", got, want)
	}
}

func TestRunTwoWorkersAbsorbTheBurst(t *testing.T) {
	got := Run([]float64{0, 0, 0, 0}, []float64{10, 10, 10, 10}, 2)
	want := []float64{10, 10, 20, 20}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("Run(2 workers) = %v, attendu %v — chaque requête prend le worker libre le plus tôt", got, want)
	}
}

func TestRunSlowRequestDoesNotBlockOtherWorker(t *testing.T) {
	// Avec 2 workers, la requête de 100 ms n'empêche pas les suivantes de passer.
	got := Run([]float64{0, 10, 20, 30}, []float64{100, 5, 5, 5}, 2)
	want := []float64{100, 5, 5, 5}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("Run = %v, attendu %v", got, want)
	}
}

func TestRunInvalid(t *testing.T) {
	if Run([]float64{0}, []float64{1}, 0) != nil {
		t.Error("0 worker : attendu nil")
	}
	if Run([]float64{0, 1}, []float64{1}, 1) != nil {
		t.Error("longueurs différentes : attendu nil")
	}
	if got := Run(nil, nil, 3); len(got) != 0 {
		t.Errorf("aucune requête : %v", got)
	}
}

func TestFanOutWaitsForTheSlowest(t *testing.T) {
	got := FanOut([][]float64{{10, 20, 5}, {1, 1}, nil, {7}})
	want := []float64{20, 1, 0, 7}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("FanOut = %v, attendu %v", got, want)
	}
}

func TestPercentileAndSlowShare(t *testing.T) {
	r := make([]float64, 100)
	for i := range r {
		r[i] = float64(100 - i)
	}
	if got := Percentile(r, 99); got != 99 {
		t.Errorf("p99 = %v, attendu 99", got)
	}
	if r[0] != 100 {
		t.Error("Percentile a modifié son entrée")
	}
	if Percentile(nil, 50) != 0 || SlowShare(nil, 1) != 0 {
		t.Error("entrée vide : attendu 0")
	}
	if got := SlowShare(r, 90); math.Abs(got-0.10) > 1e-12 {
		t.Errorf("SlowShare(>90) = %v, attendu 0,10 (strictement supérieur)", got)
	}
}

// Le scénario du livre : 1 % des appels backend sont lents, et chaque requête utilisateur en fait 100.
func TestTailAmplificationEndToEnd(t *testing.T) {
	const nCalls, nUsers = 100, 2000
	calls := make([][]float64, nUsers)
	slowCalls := 0
	for u := range calls {
		calls[u] = make([]float64, nCalls)
		for c := range calls[u] {
			calls[u][c] = 10
			if (u*nCalls+c)%100 == (u*7)%100 { // exactement 1 appel lent sur 100, réparti de façon décalée
				calls[u][c] = 500
				slowCalls++
			}
		}
	}
	if slowCalls != nUsers {
		t.Fatalf("scénario de test mal construit : %d appels lents", slowCalls)
	}
	var all []float64
	for _, c := range calls {
		all = append(all, c...)
	}
	if got := SlowShare(all, 100); math.Abs(got-0.01) > 1e-9 {
		t.Fatalf("part d'appels lents = %v, attendu 0,01", got)
	}
	users := FanOut(calls)
	if got := SlowShare(users, 100); got != 1 {
		t.Errorf("chaque requête utilisateur contient ici exactement un appel lent : part lente = %v, attendu 1", got)
	}
	if got := Percentile(users, 50); got != 500 {
		t.Errorf("médiane utilisateur = %v, attendu 500", got)
	}
	if got := Percentile(all, 50); got != 10 {
		t.Errorf("médiane des appels = %v, attendu 10", got)
	}
}

func TestMinWorkers(t *testing.T) {
	arrivals, service := steady(100, 5, 8) // un worker sature (8 ms de travail toutes les 5 ms)
	n, ok := MinWorkers(arrivals, service, 10, 8)
	if !ok || n != 2 {
		t.Errorf("MinWorkers = %d, %v, attendu 2, true", n, ok)
	}
	if n, ok := MinWorkers(arrivals, service, 10, 1); ok || n != 0 {
		t.Errorf("avec 1 worker maximum : %d, %v, attendu 0, false", n, ok)
	}
	if n, ok := MinWorkers(arrivals, service, 4, 8); ok || n != 0 {
		t.Errorf("cible p99 ≤ 4 ms alors que chaque requête prend 8 ms : %d, %v, attendu 0, false", n, ok)
	}
}
