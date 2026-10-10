package lab

import (
	"errors"
	"slices"
	"testing"
	"time"
)

func seq(from, to, step int) []int {
	var out []int
	for v := from; v <= to; v += step {
		out = append(out, v)
	}
	return out
}

func TestM1ExpandField(t *testing.T) {
	cases := []struct {
		field    string
		min, max int
		want     []int
		why      string
	}{
		{"*", 0, 59, seq(0, 59, 1), "toutes les valeurs"},
		{"*", 1, 12, seq(1, 12, 1), "toutes les valeurs, en partant de min"},
		{"7", 0, 59, []int{7}, "une valeur"},
		{"0", 0, 59, []int{0}, "zéro est valide"},
		{"1-5", 0, 59, []int{1, 2, 3, 4, 5}, "intervalle inclusif"},
		{"4-4", 0, 59, []int{4}, "intervalle d'un seul élément"},
		{"*/15", 0, 59, []int{0, 15, 30, 45}, "un pas sur toute la plage"},
		{"*/10", 1, 31, []int{1, 11, 21, 31}, "le pas part de min, pas de zéro"},
		{"10-20/5", 0, 59, []int{10, 15, 20}, "un pas dans un intervalle"},
		{"10-20/7", 0, 59, []int{10, 17}, "le pas ne dépasse pas la borne"},
		{"1,5,10-12", 0, 59, []int{1, 5, 10, 11, 12}, "liste mixte"},
		{"5,5,5", 0, 59, []int{5}, "doublons supprimés"},
		{"30,10,20", 0, 59, []int{10, 20, 30}, "résultat trié"},
		{"1-3,2-5", 0, 59, []int{1, 2, 3, 4, 5}, "intervalles qui se chevauchent"},
		{"*/100", 0, 59, []int{0}, "pas plus grand que la plage"},
		{"007", 0, 59, []int{7}, "zéros de tête tolérés"},
		{"0-6", 0, 6, seq(0, 6, 1), "jours de semaine"},
	}
	for _, c := range cases {
		got, err := ExpandField(c.field, c.min, c.max)
		if err != nil || !slices.Equal(got, c.want) {
			t.Errorf("ExpandField(%q, %d, %d) = (%v, %v), attendu %v — %s", c.field, c.min, c.max, got, err, c.want, c.why)
		}
	}
}

func TestM1ExpandFieldErrors(t *testing.T) {
	cases := []struct {
		field    string
		min, max int
		want     error
		why      string
	}{
		{"", 0, 59, ErrSyntax, "champ vide"},
		{"a", 0, 59, ErrSyntax, "pas un nombre"},
		{"1,,2", 0, 59, ErrSyntax, "élément vide dans la liste"},
		{"1-", 0, 59, ErrSyntax, "intervalle sans fin"},
		{"-1", 0, 59, ErrSyntax, "intervalle sans début, pas de nombre négatif"},
		{"1-b", 0, 59, ErrSyntax, "borne illisible"},
		{"*/", 0, 59, ErrSyntax, "pas manquant"},
		{"*/0", 0, 59, ErrSyntax, "un pas nul bouclerait sans fin"},
		{"*/x", 0, 59, ErrSyntax, "pas illisible"},
		{"1/5", 0, 59, ErrSyntax, "un pas ne s'applique qu'à * ou à un intervalle"},
		{"*-5", 0, 59, ErrSyntax, "* n'est pas une borne"},
		{" 5", 0, 59, ErrSyntax, "pas d'espace"},
		{"60", 0, 59, ErrRange, "au-dessus du maximum"},
		{"0", 1, 31, ErrRange, "en dessous du minimum"},
		{"1-60", 0, 59, ErrRange, "intervalle qui dépasse"},
		{"5-3", 0, 59, ErrRange, "intervalle inversé"},
		{"1,2,99", 0, 59, ErrRange, "une valeur hors plage dans une liste"},
	}
	for _, c := range cases {
		if got, err := ExpandField(c.field, c.min, c.max); !errors.Is(err, c.want) {
			t.Errorf("ExpandField(%q, %d, %d) = (%v, %v), attendu l'erreur %v — %s", c.field, c.min, c.max, got, err, c.want, c.why)
		}
	}
}

func TestM2Parse(t *testing.T) {
	s, err := Parse("*/20 9-17 1,15 * 1-5")
	if err != nil {
		t.Fatal(err)
	}
	if !slices.Equal(s.Minutes, []int{0, 20, 40}) || !slices.Equal(s.Hours, seq(9, 17, 1)) ||
		!slices.Equal(s.Days, []int{1, 15}) || !slices.Equal(s.Months, seq(1, 12, 1)) || !slices.Equal(s.Weekdays, seq(1, 5, 1)) {
		t.Errorf("Parse a produit %+v", s)
	}
	all, err := Parse("  *   *  * *  *  ")
	if err != nil || len(all.Minutes) != 60 || len(all.Hours) != 24 || len(all.Days) != 31 || len(all.Months) != 12 || len(all.Weekdays) != 7 {
		t.Errorf("« * * * * * » : %+v, %v — les espaces multiples sont tolérés et chaque champ couvre toute sa plage", all, err)
	}
}

func TestM2ParseErrors(t *testing.T) {
	cases := []struct {
		spec string
		want error
	}{
		{"", ErrSyntax}, {"* * * *", ErrSyntax}, {"* * * * * *", ErrSyntax}, {"a * * * *", ErrSyntax},
		{"60 * * * *", ErrRange}, {"* 24 * * *", ErrRange}, {"* * 0 * *", ErrRange}, {"* * 32 * *", ErrRange},
		{"* * * 0 *", ErrRange}, {"* * * 13 *", ErrRange}, {"* * * * 7", ErrRange},
	}
	for _, c := range cases {
		if _, err := Parse(c.spec); !errors.Is(err, c.want) {
			t.Errorf("Parse(%q) : erreur %v, attendu %v — l'erreur doit rester testable avec errors.Is", c.spec, err, c.want)
		}
	}
}

func mustParse(t *testing.T, spec string) Schedule {
	t.Helper()
	s, err := Parse(spec)
	if err != nil {
		t.Fatalf("Parse(%q) : %v", spec, err)
	}
	return s
}

func TestM2Matches(t *testing.T) {
	daily := mustParse(t, "5 4 * * *")
	at := func(h, m, s int) time.Time { return time.Date(2024, 3, 13, h, m, s, 0, time.UTC) }
	if !daily.Matches(at(4, 5, 0)) || !daily.Matches(at(4, 5, 59)) {
		t.Errorf("04:05 doit correspondre, quelle que soit la seconde")
	}
	if daily.Matches(at(4, 6, 0)) || daily.Matches(at(5, 5, 0)) || daily.Matches(at(3, 5, 0)) {
		t.Errorf("04:06, 05:05 et 03:05 ne doivent pas correspondre")
	}

	// 2024-03-13 est un mercredi (3), 2024-03-15 un vendredi (5), 2024-03-17 un dimanche (0).
	weekdays := mustParse(t, "0 9 * * 1-5")
	for day, want := range map[int]bool{11: true, 13: true, 15: true, 16: false, 17: false} {
		if got := weekdays.Matches(time.Date(2024, 3, day, 9, 0, 0, 0, time.UTC)); got != want {
			t.Errorf("« 0 9 * * 1-5 » le %d mars 2024 à 09:00 : %v, attendu %v", day, got, want)
		}
	}

	sunday := mustParse(t, "0 0 * * 0")
	if !sunday.Matches(time.Date(2024, 3, 17, 0, 0, 0, 0, time.UTC)) {
		t.Errorf("le dimanche est le jour 0")
	}

	// Jour du mois ET jour de semaine : les deux doivent correspondre.
	friday13 := mustParse(t, "0 0 13 * 5")
	if !friday13.Matches(time.Date(2024, 9, 13, 0, 0, 0, 0, time.UTC)) || friday13.Matches(time.Date(2024, 3, 13, 0, 0, 0, 0, time.UTC)) {
		t.Errorf("« 0 0 13 * 5 » : vendredi 13 oui, mercredi 13 non")
	}

	march := mustParse(t, "0 0 1 3 *")
	if !march.Matches(time.Date(2024, 3, 1, 0, 0, 0, 0, time.UTC)) || march.Matches(time.Date(2024, 4, 1, 0, 0, 0, 0, time.UTC)) {
		t.Errorf("le champ mois doit être vérifié")
	}
}

func TestM3Next(t *testing.T) {
	utc := func(y int, m time.Month, d, h, min, s int) time.Time { return time.Date(y, m, d, h, min, s, 0, time.UTC) }
	cases := []struct {
		name  string
		spec  string
		after time.Time
		want  time.Time
	}{
		{"prochain quart d'heure", "*/15 * * * *", utc(2024, 3, 10, 10, 7, 0), utc(2024, 3, 10, 10, 15, 0)},
		{"strictement après", "*/15 * * * *", utc(2024, 3, 10, 10, 15, 0), utc(2024, 3, 10, 10, 30, 0)},
		{"les secondes de after sont ignorées", "*/15 * * * *", utc(2024, 3, 10, 10, 14, 59), utc(2024, 3, 10, 10, 15, 0)},
		{"passage à l'heure suivante", "*/15 * * * *", utc(2024, 3, 10, 10, 59, 30), utc(2024, 3, 10, 11, 0, 0)},
		{"minuit du jour suivant", "0 0 * * *", utc(2024, 3, 10, 10, 0, 0), utc(2024, 3, 11, 0, 0, 0)},
		{"premier du mois", "0 0 1 * *", utc(2024, 3, 10, 0, 0, 0), utc(2024, 4, 1, 0, 0, 0)},
		{"lundi 08:30", "30 8 * * 1", utc(2024, 3, 13, 12, 0, 0), utc(2024, 3, 18, 8, 30, 0)},
		{"week-end à midi", "0 12 * * 0,6", utc(2024, 3, 15, 13, 0, 0), utc(2024, 3, 16, 12, 0, 0)},
		{"changement d'année", "0 0 1 1 *", utc(2024, 6, 15, 8, 0, 0), utc(2025, 1, 1, 0, 0, 0)},
		{"dernière minute de l'année", "59 23 31 12 *", utc(2024, 12, 31, 23, 59, 0), utc(2025, 12, 31, 23, 59, 0)},
		{"29 février", "0 0 29 2 *", utc(2024, 3, 1, 0, 0, 0), utc(2028, 2, 29, 0, 0, 0)},
		{"vendredi 13", "0 0 13 * 5", utc(2024, 1, 1, 0, 0, 0), utc(2024, 9, 13, 0, 0, 0)},
		{"mois précis", "15 6 * 7 *", utc(2024, 3, 10, 0, 0, 0), utc(2024, 7, 1, 6, 15, 0)},
		{"jours ouvrés, heures de bureau", "*/30 9-17 * * 1-5", utc(2024, 3, 15, 17, 30, 0), utc(2024, 3, 18, 9, 0, 0)},
	}
	for _, c := range cases {
		got, ok := mustParse(t, c.spec).Next(c.after)
		if !ok || !got.Equal(c.want) {
			t.Errorf("%s : %q après %v → (%v, %v), attendu %v", c.name, c.spec, c.after.Format("2006-01-02 15:04:05"), got.Format("2006-01-02 15:04:05"), ok, c.want.Format("2006-01-02 15:04:05"))
		}
	}
}

func TestM3NextNeverMatches(t *testing.T) {
	for _, spec := range []string{"0 0 30 2 *", "0 0 31 4 *", "0 0 31 6,9,11 *"} {
		if got, ok := mustParse(t, spec).Next(time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)); ok {
			t.Errorf("%q ne correspond à aucune date réelle : Next a renvoyé %v", spec, got)
		}
	}
}

func TestM3NextKeepsTheLocation(t *testing.T) {
	zone := time.FixedZone("UTC+1", 3600)
	after := time.Date(2024, 3, 10, 10, 7, 0, 0, zone)
	got, ok := mustParse(t, "*/15 * * * *").Next(after)
	want := time.Date(2024, 3, 10, 10, 15, 0, 0, zone)
	if !ok || !got.Equal(want) || got.Location() != zone {
		t.Errorf("Next dans un fuseau : (%v, %v), attendu %v dans le fuseau d'origine", got, ok, want)
	}
}

func TestM3NextChains(t *testing.T) {
	s := mustParse(t, "*/20 * * * *")
	cur := time.Date(2024, 3, 10, 23, 30, 0, 0, time.UTC)
	var got []string
	for i := 0; i < 4; i++ {
		next, ok := s.Next(cur)
		if !ok {
			t.Fatal("Next a échoué")
		}
		got = append(got, next.Format("01-02 15:04"))
		cur = next
	}
	if want := []string{"03-10 23:40", "03-11 00:00", "03-11 00:20", "03-11 00:40"}; !slices.Equal(got, want) {
		t.Errorf("enchaînement de Next à travers minuit : %v, attendu %v", got, want)
	}
}
