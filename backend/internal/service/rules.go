package service

import (
	"math"
	"slices"
	"time"
)

// Règles d'XP, de niveau, de série de jours et d'intensité.

const (
	QuizXPPerQuestion = 5
	hintPenalty       = 0.2
	minXPRatio        = 0.4
)

// ExerciseXP : chaque indice dévoilé retire 20 % de l'XP, sans descendre sous 40 %.
// Arrondi au pair le plus proche, comme round() en Python.
func ExerciseXP(base, hintsRevealed int) int {
	return int(math.RoundToEven(float64(base) * max(minXPRatio, 1-hintPenalty*float64(hintsRevealed))))
}

// XPForLevel est l'XP cumulée nécessaire pour atteindre un niveau : 0, 100, 300, 600, 1000…
func XPForLevel(level int) int { return 50 * level * (level - 1) }

func LevelForXP(xp int) int {
	level := 1
	for xp >= XPForLevel(level+1) {
		level++
	}
	return level
}

// Les jours sont des time.Time à minuit UTC : seule la date compte.

func Date(y int, m time.Month, d int) time.Time { return time.Date(y, m, d, 0, 0, 0, 0, time.UTC) }

func addDays(d time.Time, n int) time.Time { return d.AddDate(0, 0, n) }

// weekday renvoie 0 pour lundi … 6 pour dimanche.
func weekday(d time.Time) int { return (int(d.Weekday()) + 6) % 7 }

// Streak compte les jours consécutifs avec de l'activité, se terminant aujourd'hui ou hier.
func Streak(activeDays []time.Time, today time.Time) int {
	days := map[time.Time]bool{}
	for _, d := range activeDays {
		days[d] = true
	}
	start := today
	if !days[today] {
		start = addDays(today, -1)
	}
	count := 0
	for days[addDays(start, -count)] {
		count++
	}
	return count
}

// LongestStreak est la plus longue suite de jours consécutifs avec de l'activité.
func LongestStreak(activeDays []time.Time) int {
	days := slices.Clone(activeDays)
	slices.SortFunc(days, func(a, b time.Time) int { return a.Compare(b) })
	days = slices.CompactFunc(days, func(a, b time.Time) bool { return a.Equal(b) })
	best, run := 0, 0
	for i, d := range days {
		if i > 0 && addDays(days[i-1], 1).Equal(d) {
			run++
		} else {
			run = 1
		}
		best = max(best, run)
	}
	return best
}

// Intensity est le niveau 0–4 d'une case du graphe, relatif au jour le plus actif (comme GitHub).
func Intensity(total, peak int) int {
	if total <= 0 || peak <= 0 {
		return 0
	}
	return min(4, max(1, (total*4+peak-1)/peak))
}

// ActivityStart est le lundi de la plus ancienne semaine affichée : le graphe commence par une colonne pleine.
func ActivityStart(today time.Time, weeks int) time.Time {
	return addDays(today, -weekday(today)-7*(weeks-1))
}
