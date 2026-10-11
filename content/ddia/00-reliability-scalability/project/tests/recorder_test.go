package lab

import (
	"errors"
	"math"
	"reflect"
	"testing"
	"time"
)

var bounds = []float64{1, 5, 25, 100}

func ms(n int) time.Duration { return time.Duration(n) * time.Millisecond }

func fill(r *Recorder, op string, d time.Duration, n int) {
	for i := 0; i < n; i++ {
		r.Record(op, d)
	}
}

func TestM1RecordAndQuantile(t *testing.T) {
	r := NewRecorder(bounds)
	fill(r, "get", ms(2), 90) // tranche ≤ 5
	fill(r, "get", ms(25), 9) // borne incluse : tranche ≤ 25
	fill(r, "get", ms(300), 1)
	if r.Count("get") != 100 {
		t.Fatalf("Count = %d, attendu 100", r.Count("get"))
	}
	for _, tt := range []struct{ p, want float64 }{{50, 5}, {90, 5}, {91, 25}, {99, 25}} {
		if got := r.Quantile("get", tt.p); got != tt.want {
			t.Errorf("Quantile(get, %v) = %v, attendu %v", tt.p, got, tt.want)
		}
	}
	if got := r.Quantile("get", 100); !math.IsInf(got, 1) {
		t.Errorf("Quantile(get, 100) = %v, attendu +Inf (débordement)", got)
	}
}

func TestM1OperationsAreIndependent(t *testing.T) {
	r := NewRecorder(bounds)
	fill(r, "get", ms(1), 3)
	fill(r, "put", ms(50), 2)
	if r.Count("get") != 3 || r.Count("put") != 2 || r.Count("scan") != 0 {
		t.Errorf("comptes = %d/%d/%d, attendu 3/2/0", r.Count("get"), r.Count("put"), r.Count("scan"))
	}
	if got := r.Quantile("put", 50); got != 100 {
		t.Errorf("Quantile(put, 50) = %v, attendu 100", got)
	}
	if got := r.Quantile("scan", 99); got != 0 {
		t.Errorf("opération inconnue : %v, attendu 0", got)
	}
}

func TestM1CopiesBounds(t *testing.T) {
	b := []float64{1, 5}
	r := NewRecorder(b)
	b[0] = 100
	r.Record("x", ms(1))
	if got := r.Quantile("x", 100); got != 1 {
		t.Errorf("le Recorder partage la slice de bornes de l'appelant (Quantile = %v, attendu 1)", got)
	}
}

func TestM1SubMillisecond(t *testing.T) {
	r := NewRecorder(bounds)
	r.Record("get", 300*time.Microsecond)
	if got := r.Quantile("get", 50); got != 1 {
		t.Errorf("300 µs = 0,3 ms doit tomber dans la tranche ≤ 1 ms, obtenu %v — ne tronque pas en millisecondes entières", got)
	}
}

func TestM2OpsSorted(t *testing.T) {
	r := NewRecorder(bounds)
	r.Record("put", ms(1))
	r.Record("get", ms(1))
	r.Record("delete", ms(1))
	if got := r.Ops(); !reflect.DeepEqual(got, []string{"delete", "get", "put"}) {
		t.Errorf("Ops = %v, attendu [delete get put]", got)
	}
	if got := NewRecorder(bounds).Ops(); len(got) != 0 {
		t.Errorf("Recorder vide : Ops = %v", got)
	}
}

func TestM2MergeIsNotAveraging(t *testing.T) {
	a, b := NewRecorder(bounds), NewRecorder(bounds)
	fill(a, "get", ms(1), 1000)
	fill(b, "get", ms(100), 10)
	fill(b, "scan", ms(25), 4) // opération inconnue de a
	avg := (a.Quantile("get", 95) + b.Quantile("get", 95)) / 2
	if err := a.Merge(b); err != nil {
		t.Fatal(err)
	}
	if a.Count("get") != 1010 || a.Count("scan") != 4 {
		t.Errorf("comptes après fusion = %d/%d, attendu 1010/4", a.Count("get"), a.Count("scan"))
	}
	if got := a.Quantile("get", 95); got != 1 {
		t.Errorf("p95 fusionné = %v, attendu 1 (la moyenne des p95, %v, est fausse)", got, avg)
	}
	if got := b.Count("get"); got != 10 {
		t.Errorf("Merge a modifié other (Count = %d, attendu 10)", got)
	}
}

func TestM2MergeKeepsOtherIndependent(t *testing.T) {
	a, b := NewRecorder(bounds), NewRecorder(bounds)
	fill(b, "scan", ms(1), 2)
	a.Merge(b)
	a.Record("scan", ms(1))
	if b.Count("scan") != 2 {
		t.Errorf("a et b partagent leurs compteurs après Merge (b.Count = %d, attendu 2) — copie les comptes", b.Count("scan"))
	}
}

func TestM2MergeMismatch(t *testing.T) {
	a, b := NewRecorder([]float64{1, 5}), NewRecorder([]float64{1, 10})
	b.Record("get", ms(1))
	if err := a.Merge(b); !errors.Is(err, ErrBoundsMismatch) {
		t.Errorf("err = %v, attendu ErrBoundsMismatch", err)
	}
	if len(a.Ops()) != 0 {
		t.Errorf("Merge en échec a modifié le Recorder : %v", a.Ops())
	}
}

func TestM3EvaluateLatency(t *testing.T) {
	r := NewRecorder(bounds)
	fill(r, "get", ms(2), 99)
	fill(r, "get", ms(90), 1)
	ok := r.Evaluate(SLO{Op: "get", Percentile: 99, MaxMs: 5, Availability: 0.99}, 0)
	if !ok.LatencyMet || ok.ObservedMs != 5 || ok.Op != "get" {
		t.Errorf("p99 = 5 ms ≤ 5 ms attendu respecté, obtenu %+v", ok)
	}
	bad := r.Evaluate(SLO{Op: "get", Percentile: 100, MaxMs: 50, Availability: 0.99}, 0)
	if bad.LatencyMet || bad.ObservedMs != 100 {
		t.Errorf("p100 = 100 ms > 50 ms attendu violé, obtenu %+v", bad)
	}
}

func TestM3ErrorBudget(t *testing.T) {
	r := NewRecorder(bounds)
	fill(r, "put", ms(1), 1000)
	slo := SLO{Op: "put", Percentile: 99, MaxMs: 10, Availability: 0.999}
	for _, tt := range []struct{ failed, want int }{{0, 1}, {1, 0}, {3, -2}} {
		if got := r.Evaluate(slo, tt.failed).BudgetRemaining; got != tt.want {
			t.Errorf("%d échecs sur 1000 à 99,9 %% : budget restant = %d, attendu %d", tt.failed, got, tt.want)
		}
	}
	if got := r.Evaluate(SLO{Op: "put", Percentile: 99, MaxMs: 10, Availability: 0.99}, 4).BudgetRemaining; got != 6 {
		t.Errorf("à 99 %% sur 1000 : %d, attendu 6 (10 tolérés − 4)", got)
	}
}

func TestM3NoMeasurements(t *testing.T) {
	v := NewRecorder(bounds).Evaluate(SLO{Op: "get", Percentile: 99, MaxMs: 5, Availability: 0.999}, 0)
	if !v.LatencyMet || v.ObservedMs != 0 || v.BudgetRemaining != 0 {
		t.Errorf("sans mesure : %+v, attendu latence respectée, 0 ms, budget 0", v)
	}
}
