package service

import (
	"slices"
	"strings"
	"testing"
	"time"
)

func TestPickQuestsDeterministicAndDistinctFamilies(t *testing.T) {
	sets := map[string]bool{}
	for uid := int64(1); uid <= 5; uid++ {
		for i := range 60 {
			day := addDays(Date(2026, 11, 1), i)
			got := PickQuests(uid, day, QuestPool)
			if len(got) != QuestsPerDay {
				t.Fatalf("uid %d %s : %d quêtes", uid, isoDate(day), len(got))
			}
			if again := PickQuests(uid, day, QuestPool); !slices.Equal(ids(got), ids(again)) {
				t.Fatalf("tirage instable : %v puis %v", ids(got), ids(again))
			}
			families := map[string]bool{}
			for _, q := range got {
				if families[q.Family] {
					t.Fatalf("deux quêtes de la famille %s : %v", q.Family, ids(got))
				}
				families[q.Family] = true
			}
			sets[strings.Join(ids(got), ",")] = true
		}
	}
	if len(sets) < 10 {
		t.Errorf("le tirage varie trop peu : %d combinaisons", len(sets))
	}
}

func TestPickQuestsSmallPool(t *testing.T) {
	pool := []QuestDef{QuestPool[0], QuestPool[1], QuestPool[8]} // lessons ×2, runs
	if got := PickQuests(1, Date(2026, 11, 17), pool); len(got) != 2 {
		t.Errorf("2 familles seulement : %v", ids(got))
	}
}

func ids(qs []QuestDef) []string {
	out := []string{}
	for _, q := range qs {
		out = append(out, q.ID)
	}
	return out
}

func TestChestXP(t *testing.T) {
	seen := map[int]bool{}
	for uid := int64(1); uid <= 10; uid++ {
		for i := range 100 {
			day := addDays(Date(2026, 1, 1), i)
			xp := ChestXP(uid, day)
			if xp < 20 || xp > 60 || xp%5 != 0 {
				t.Fatalf("coffre hors bornes : %d", xp)
			}
			if xp != ChestXP(uid, day) {
				t.Fatal("coffre non déterministe")
			}
			seen[xp] = true
		}
	}
	if len(seen) != 9 {
		t.Errorf("toutes les valeurs 20..60 devraient sortir : %v", seen)
	}
}

func TestNextReview(t *testing.T) {
	today := Date(2026, 11, 17)
	cases := []struct {
		box     int
		known   bool
		wantBox int
		days    int
		lapse   bool
	}{
		{0, true, 1, 1, false},
		{1, true, 2, 2, false},
		{2, true, 3, 4, false},
		{3, true, 4, 8, false},
		{4, true, 5, 16, false},
		{5, true, 5, 16, false},
		{0, false, 1, 1, true},
		{4, false, 1, 1, true},
	}
	for _, c := range cases {
		box, due, lapse := NextReview(c.box, c.known, today)
		if box != c.wantBox || !due.Equal(addDays(today, c.days)) || lapse != c.lapse {
			t.Errorf("NextReview(%d, %v) = %d, %s, %v", c.box, c.known, box, isoDate(due), lapse)
		}
	}
}

func TestWeekAcrossTimeZones(t *testing.T) {
	paris, _ := time.LoadLocation("Europe/Paris")
	la, _ := time.LoadLocation("America/Los_Angeles")
	cases := []struct {
		at        string
		loc       *time.Location
		today     string
		weekStart string
	}{
		{"2026-11-15T23:30:00Z", time.UTC, "2026-11-15", "2026-11-09"}, // dimanche soir UTC
		{"2026-11-15T23:30:00Z", paris, "2026-11-16", "2026-11-16"},    // déjà lundi à Paris
		{"2026-11-16T05:00:00Z", la, "2026-11-15", "2026-11-09"},       // encore dimanche à Los Angeles
		{"2026-11-22T22:59:00Z", paris, "2026-11-22", "2026-11-16"},    // dimanche 23 h 59 à Paris
	}
	for _, c := range cases {
		at, _ := time.Parse(time.RFC3339, c.at)
		day := LocalDay(at, c.loc)
		week := WeekDays(day)
		if isoDate(day) != c.today || isoDate(week[0]) != c.weekStart || len(week) != 7 ||
			week[6].Sub(week[0]) != 6*24*time.Hour || week[0].Weekday() != time.Monday {
			t.Errorf("%s %s : jour %s, semaine %s..%s", c.at, c.loc, isoDate(day), isoDate(week[0]), isoDate(week[6]))
		}
	}
}

func TestDatedRefFits(t *testing.T) {
	day := Date(2026, 11, 17)
	if got := datedRef(day, "java-ch01-l01/fc1"); got != "2026-11-17/java-ch01-l01/fc1" {
		t.Errorf("ref courte : %s", got)
	}
	long := strings.Repeat("x", 200)
	got := datedRef(day, long)
	if len(got) > refMax || got != datedRef(day, long) || got == datedRef(day, long+"y") {
		t.Errorf("ref longue : %q", got)
	}
}

func TestFirstTryXP(t *testing.T) {
	for base, want := range map[int]int{40: 8, 25: 5, 50: 10, 2: 0, 13: 3} {
		if got := FirstTryXP(base); got != want {
			t.Errorf("FirstTryXP(%d) = %d, attendu %d", base, got, want)
		}
	}
}
