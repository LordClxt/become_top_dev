package lab

import (
	"math"
	"testing"
	"time"
)

func near(a, b, eps float64) bool { return math.Abs(a-b) <= eps }

func TestDiskFailuresPerDay(t *testing.T) {
	cases := []struct {
		disks int
		mttf  float64
		want  float64
	}{
		{10_000, 27.4, 0.99990},
		{10_000, 50, 0.547945},
		{10_000, 10, 2.739726},
		{1, 10, 1.0 / 3650},
		{0, 10, 0},
		{100, 0, 0},
		{-5, 10, 0},
	}
	for _, c := range cases {
		if got := DiskFailuresPerDay(c.disks, c.mttf); !near(got, c.want, 1e-4) {
			t.Errorf("DiskFailuresPerDay(%d, %v) = %v, attendu %v", c.disks, c.mttf, got, c.want)
		}
	}
}

func TestSeriesAvailability(t *testing.T) {
	cases := []struct {
		in   []float64
		want float64
	}{
		{[]float64{0.999, 0.999, 0.999}, 0.997002999},
		{[]float64{0.99}, 0.99},
		{[]float64{1, 1}, 1},
		{[]float64{0.9, 0}, 0},
		{nil, 1},
	}
	for _, c := range cases {
		if got := SeriesAvailability(c.in...); !near(got, c.want, 1e-9) {
			t.Errorf("SeriesAvailability(%v) = %v, attendu %v — tous les composants sont nécessaires : on multiplie", c.in, got, c.want)
		}
	}
}

func TestParallelAvailability(t *testing.T) {
	cases := []struct {
		in   []float64
		want float64
	}{
		{[]float64{0.9, 0.9}, 0.99},
		{[]float64{0.99, 0.99, 0.99}, 0.999999},
		{[]float64{0.5}, 0.5},
		{[]float64{0, 0}, 0},
		{[]float64{1, 0.1}, 1},
		{nil, 0},
	}
	for _, c := range cases {
		if got := ParallelAvailability(c.in...); !near(got, c.want, 1e-9) {
			t.Errorf("ParallelAvailability(%v) = %v, attendu %v — il suffit qu'un composant marche : on multiplie les indisponibilités", c.in, got, c.want)
		}
	}
}

func TestRedundancyBeatsASingleComponentOnlyWhenFailuresAreIndependent(t *testing.T) {
	single := 0.99
	two := ParallelAvailability(single, single)
	if two <= single {
		t.Errorf("deux composants indépendants doivent être plus disponibles qu'un seul : %v vs %v", two, single)
	}
	// Une dépendance commune (un seul load balancer, nécessaire) plafonne la disponibilité de l'ensemble.
	withSharedDependency := SeriesAvailability(0.999, ParallelAvailability(single, single))
	if withSharedDependency >= 0.999 {
		t.Errorf("la disponibilité d'un ensemble ne dépasse jamais celle d'un composant nécessaire : %v", withSharedDependency)
	}
}

func TestDowntimePerYear(t *testing.T) {
	cases := []struct {
		availability float64
		want         time.Duration
	}{
		{0.99, 87*time.Hour + 36*time.Minute},
		{0.999, 8*time.Hour + 45*time.Minute + 36*time.Second},
		{0.9999, 52*time.Minute + 33*time.Second + 600*time.Millisecond},
		{1, 0},
		{0, 365 * 24 * time.Hour},
		{1.5, 0},
		{-1, 365 * 24 * time.Hour},
	}
	for _, c := range cases {
		got := DowntimePerYear(c.availability)
		if d := got - c.want; d > time.Second || d < -time.Second {
			t.Errorf("DowntimePerYear(%v) = %v, attendu %v", c.availability, got, c.want)
		}
	}
}

func TestRequiredAvailability(t *testing.T) {
	cases := []struct {
		downtime time.Duration
		want     float64
	}{
		{8*time.Hour + 45*time.Minute + 36*time.Second, 0.999},
		{87*time.Hour + 36*time.Minute, 0.99},
		{0, 1},
		{365 * 24 * time.Hour, 0},
		{400 * 24 * time.Hour, 0},
		{-time.Hour, 1},
	}
	for _, c := range cases {
		if got := RequiredAvailability(c.downtime); !near(got, c.want, 1e-9) {
			t.Errorf("RequiredAvailability(%v) = %v, attendu %v", c.downtime, got, c.want)
		}
	}
}

func TestNines(t *testing.T) {
	cases := map[float64]int{
		0: 0, 0.5: 0, 0.89: 0, 0.9: 1, 0.95: 1, 0.99: 2, 0.995: 2, 0.999: 3, 0.9995: 3, 0.9999: 4, 0.99999: 5, 0.999999: 6,
		1: 15, 1.2: 15,
	}
	for in, want := range cases {
		if got := Nines(in); got != want {
			t.Errorf("Nines(%v) = %d, attendu %d", in, got, want)
		}
	}
}
