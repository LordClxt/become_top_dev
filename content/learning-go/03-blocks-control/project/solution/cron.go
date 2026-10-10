package lab

import (
	"errors"
	"fmt"
	"slices"
	"strconv"
	"strings"
	"time"
)

var (
	ErrSyntax = errors.New("syntaxe invalide")
	ErrRange  = errors.New("valeur hors plage")
)

// ExpandField développe un champ de planification en la liste triée et sans doublon de ses valeurs.
//
//   - toutes les valeurs de min à max
//     N          une valeur
//     A-B        un intervalle inclusif
//     X/S        (X vaut * ou A-B) une valeur sur S à partir du début de X
//     a,b,c      une liste d'éléments de ces formes
func ExpandField(field string, min, max int) ([]int, error) {
	if field == "" {
		return nil, fmt.Errorf("%w : champ vide", ErrSyntax)
	}
	set := map[int]bool{}
	for _, item := range strings.Split(field, ",") {
		values, err := expandItem(item, min, max)
		if err != nil {
			return nil, err
		}
		for _, v := range values {
			set[v] = true
		}
	}
	out := make([]int, 0, len(set))
	for v := range set {
		out = append(out, v)
	}
	slices.Sort(out)
	return out, nil
}

func expandItem(item string, min, max int) ([]int, error) {
	base, stepText, hasStep := strings.Cut(item, "/")

	step := 1
	if hasStep {
		n, ok := atoi(stepText)
		if !ok || n == 0 {
			return nil, fmt.Errorf("%w : pas %q", ErrSyntax, stepText)
		}
		step = n
	}

	var first, last int
	switch {
	case base == "*":
		first, last = min, max
	case strings.Contains(base, "-"):
		from, to, _ := strings.Cut(base, "-")
		a, okA := atoi(from)
		b, okB := atoi(to)
		if !okA || !okB {
			return nil, fmt.Errorf("%w : intervalle %q", ErrSyntax, base)
		}
		if a < min || b > max || a > b {
			return nil, fmt.Errorf("%w : intervalle %q hors de %d-%d", ErrRange, base, min, max)
		}
		first, last = a, b
	default:
		n, ok := atoi(base)
		if !ok || hasStep {
			return nil, fmt.Errorf("%w : élément %q", ErrSyntax, item)
		}
		if n < min || n > max {
			return nil, fmt.Errorf("%w : %d hors de %d-%d", ErrRange, n, min, max)
		}
		first, last = n, n
	}

	var values []int
	for v := first; v <= last; v += step {
		values = append(values, v)
	}
	return values, nil
}

// atoi lit un entier décimal fait uniquement de chiffres (ni signe, ni espace).
func atoi(s string) (int, bool) {
	if s == "" || strings.Trim(s, "0123456789") != "" {
		return 0, false
	}
	n, err := strconv.Atoi(s)
	return n, err == nil
}

// Schedule est une planification à cinq champs, façon cron.
type Schedule struct {
	Minutes, Hours, Days, Months, Weekdays []int
}

// Parse lit « minute heure jour-du-mois mois jour-de-semaine ».
// Plages : minute 0-59, heure 0-23, jour 1-31, mois 1-12, jour de semaine 0-6 (0 = dimanche).
func Parse(spec string) (Schedule, error) {
	fields := strings.Fields(spec)
	if len(fields) != 5 {
		return Schedule{}, fmt.Errorf("%w : 5 champs attendus, %d reçus", ErrSyntax, len(fields))
	}
	var s Schedule
	specs := []struct {
		name     string
		min, max int
		dst      *[]int
	}{
		{"minute", 0, 59, &s.Minutes},
		{"heure", 0, 23, &s.Hours},
		{"jour du mois", 1, 31, &s.Days},
		{"mois", 1, 12, &s.Months},
		{"jour de semaine", 0, 6, &s.Weekdays},
	}
	for i, f := range specs {
		values, err := ExpandField(fields[i], f.min, f.max)
		if err != nil {
			return Schedule{}, fmt.Errorf("champ %s : %w", f.name, err)
		}
		*f.dst = values
	}
	return s, nil
}

// Matches indique si la minute de t correspond à la planification (les secondes sont ignorées).
// Les cinq champs doivent tous correspondre, y compris jour du mois ET jour de semaine.
func (s Schedule) Matches(t time.Time) bool {
	return slices.Contains(s.Minutes, t.Minute()) &&
		slices.Contains(s.Hours, t.Hour()) &&
		slices.Contains(s.Days, t.Day()) &&
		slices.Contains(s.Months, int(t.Month())) &&
		slices.Contains(s.Weekdays, int(t.Weekday()))
}

// Next renvoie la première minute strictement postérieure à after qui correspond à la planification,
// avec les secondes à zéro, dans le fuseau de after. ok vaut false si aucune minute ne correspond dans les cinq ans.
func (s Schedule) Next(after time.Time) (next time.Time, ok bool) {
	loc := after.Location()
	t := time.Date(after.Year(), after.Month(), after.Day(), after.Hour(), after.Minute()+1, 0, 0, loc)
	limit := after.AddDate(5, 0, 0)

	for t.Before(limit) {
		switch {
		case !slices.Contains(s.Months, int(t.Month())):
			t = time.Date(t.Year(), t.Month()+1, 1, 0, 0, 0, 0, loc)
		case !slices.Contains(s.Days, t.Day()) || !slices.Contains(s.Weekdays, int(t.Weekday())):
			t = time.Date(t.Year(), t.Month(), t.Day()+1, 0, 0, 0, 0, loc)
		case !slices.Contains(s.Hours, t.Hour()):
			t = time.Date(t.Year(), t.Month(), t.Day(), t.Hour()+1, 0, 0, 0, loc)
		case !slices.Contains(s.Minutes, t.Minute()):
			t = t.Add(time.Minute)
		default:
			return t, true
		}
	}
	return time.Time{}, false
}
