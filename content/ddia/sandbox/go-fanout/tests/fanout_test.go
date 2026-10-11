package lab

import (
	"math"
	"testing"
)

func near(a, b float64) bool { return math.Abs(a-b) <= 1e-6*math.Max(1, math.Abs(b)) }

// Twitter, novembre 2012 : 4,6 k tweets/s, 300 k lectures de fil/s, 75 abonnés en moyenne.
func twitter2012() Workload {
	return Workload{
		TweetsPerSec:           4600,
		TimelineReadsPerSec:    300_000,
		Followers:              []int{75},
		AvgFollowing:           75,
		AvgCelebritiesFollowed: 2,
		CelebrityThreshold:     1_000_000,
	}
}

func TestEstimateWithTheAverageUser(t *testing.T) {
	w := twitter2012()

	fanIn := Estimate(ReadFanIn, w)
	if !near(fanIn.WritesPerSec, 4600) || !near(fanIn.ReadsPerSec, 22_500_000) {
		t.Errorf("ReadFanIn = %+v, attendu 4 600 écritures et 22,5 M recherches par seconde", fanIn)
	}

	fanOut := Estimate(WriteFanOut, w)
	if !near(fanOut.WritesPerSec, 345_000) || !near(fanOut.ReadsPerSec, 300_000) {
		t.Errorf("WriteFanOut = %+v, attendu 345 000 écritures (4,6 k × 75) et 300 000 lectures", fanOut)
	}

	if fanOut.Total() >= fanIn.Total() {
		t.Errorf("avec ce ratio lectures/écritures, préparer à l'écriture doit coûter bien moins que tout assembler à la lecture : %v contre %v", fanOut.Total(), fanIn.Total())
	}
}

func TestTotal(t *testing.T) {
	if got := (Cost{WritesPerSec: 3, ReadsPerSec: 4}).Total(); got != 7 {
		t.Errorf("Total = %v, attendu 7", got)
	}
}

// 99 comptes ordinaires (10 abonnés) et une célébrité (30 millions).
func skewed() Workload {
	followers := make([]int, 0, 100)
	for i := 0; i < 99; i++ {
		followers = append(followers, 10)
	}
	followers = append(followers, 30_000_000)
	w := twitter2012()
	w.Followers = followers
	return w
}

func TestOneCelebrityDominatesPureFanOut(t *testing.T) {
	w := skewed()
	pure := Estimate(WriteFanOut, w)
	// moyenne = (99 × 10 + 30 000 000) / 100 = 300 009,9 abonnés par tweet
	if !near(pure.WritesPerSec, 4600*300_009.9) {
		t.Errorf("WriteFanOut sur une distribution déséquilibrée = %v écritures/s, attendu %v", pure.WritesPerSec, 4600*300_009.9)
	}

	hybrid := Estimate(Hybrid, w)
	// la célébrité coûte 1 : moyenne = (99 × 10 + 1) / 100 = 9,91
	if !near(hybrid.WritesPerSec, 4600*9.91) {
		t.Errorf("Hybrid = %v écritures/s, attendu %v", hybrid.WritesPerSec, 4600*9.91)
	}
	if !near(hybrid.ReadsPerSec, 300_000*3) {
		t.Errorf("Hybrid : chaque lecture coûte 1 + 2 célébrités suivies = 3 recherches, soit %v lectures/s, reçu %v", 900_000.0, hybrid.ReadsPerSec)
	}
	if hybrid.Total() >= pure.Total()/100 {
		t.Errorf("l'approche hybride doit réduire le coût de plusieurs ordres de grandeur : %v contre %v", hybrid.Total(), pure.Total())
	}
}

func TestMaxFanOut(t *testing.T) {
	w := skewed()
	cases := []struct {
		s    Strategy
		want int
	}{
		{ReadFanIn, 1},
		{WriteFanOut, 30_000_000},
		{Hybrid, 10},
	}
	for _, c := range cases {
		if got := MaxFanOut(c.s, w); got != c.want {
			t.Errorf("MaxFanOut(%v) = %d, attendu %d", c.s, got, c.want)
		}
	}
}

func TestCelebrityThresholdIsExclusive(t *testing.T) {
	w := Workload{TweetsPerSec: 1, Followers: []int{1000}, CelebrityThreshold: 1000}
	if got := MaxFanOut(Hybrid, w); got != 1000 {
		t.Errorf("un compte avec exactement le seuil n'est pas une célébrité : fan-out %d, attendu 1000", got)
	}
	w.CelebrityThreshold = 999
	if got := MaxFanOut(Hybrid, w); got != 1 {
		t.Errorf("au-dessus du seuil, c'est une célébrité : fan-out %d, attendu 1", got)
	}
}

func TestEmptyFollowers(t *testing.T) {
	w := Workload{TweetsPerSec: 100, TimelineReadsPerSec: 100, AvgFollowing: 5}
	for _, s := range []Strategy{ReadFanIn, WriteFanOut, Hybrid} {
		cost := Estimate(s, w)
		if cost.WritesPerSec != 0 {
			t.Errorf("sans compte qui publie, les écritures sont nulles (stratégie %v) : %v", s, cost.WritesPerSec)
		}
		if got := MaxFanOut(s, w); got != 0 {
			t.Errorf("MaxFanOut(%v) sans compte = %d", s, got)
		}
	}
	if got := Estimate(ReadFanIn, w).ReadsPerSec; !near(got, 500) {
		t.Errorf("les lectures ne dépendent pas des abonnés : %v", got)
	}
}
