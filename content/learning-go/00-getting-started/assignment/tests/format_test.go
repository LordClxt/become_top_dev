package lab

import (
	"slices"
	"testing"
)

func TestVerbs(t *testing.T) {
	cases := []struct {
		format string
		want   []string
	}{
		{"Bonjour, %s !", []string{"%s"}},
		{"%s a %d messages", []string{"%s", "%d"}},
		{"[%-10s] %5d %.2f %+v %#x", []string{"%-10s", "%5d", "%.2f", "%+v", "%#x"}},
		{"%08.3f", []string{"%08.3f"}},
		{"aucun verbe", nil},
		{"75%% fait", nil},
		{"%%%d%%", []string{"%d"}},
		{"%T et %q", []string{"%T", "%q"}},
	}
	for _, c := range cases {
		got := CheckFormat(c.format, len(c.want)).Verbs
		if !slices.Equal(got, c.want) {
			t.Errorf("CheckFormat(%q).Verbs = %q, attendu %q", c.format, got, c.want)
		}
	}
}

func TestArgCount(t *testing.T) {
	cases := []struct {
		format         string
		nargs          int
		missing, extra int
	}{
		{"%s a %d messages", 2, 0, 0},
		{"%s a %d messages", 1, 1, 0},
		{"%s a %d messages", 0, 2, 0},
		{"total", 1, 0, 1},
		{"%d", 3, 0, 2},
		{"%*d", 2, 0, 0},
		{"%*d", 1, 1, 0},
		{"%-*.*f", 3, 0, 0},
		{"%%", 1, 0, 1},
	}
	for _, c := range cases {
		r := CheckFormat(c.format, c.nargs)
		if r.Missing != c.missing || r.Extra != c.extra {
			t.Errorf("CheckFormat(%q, %d) : Missing=%d Extra=%d, attendu Missing=%d Extra=%d — chaque * lit aussi une valeur",
				c.format, c.nargs, r.Missing, r.Extra, c.missing, c.extra)
		}
	}
}

func TestTrailingPercent(t *testing.T) {
	for _, f := range []string{"75%", "%", "%-", "%5.", "fini à 100%"} {
		if r := CheckFormat(f, 1); !r.Trailing {
			t.Errorf("CheckFormat(%q).Trailing = false, attendu true : le format finit au milieu d'un verbe", f)
		}
	}
	if r := CheckFormat("75%%", 0); r.Trailing {
		t.Errorf("CheckFormat(\"75%%%%\").Trailing = true, attendu false : %%%% est un %% littéral")
	}
}

func TestUnknownVerbs(t *testing.T) {
	r := CheckFormat("%d %z %y", 3)
	if !slices.Equal(r.Unknown, []string{"%z", "%y"}) {
		t.Errorf("CheckFormat(\"%%d %%z %%y\").Unknown = %q, attendu [\"%%z\" \"%%y\"]", r.Unknown)
	}
	if r.Missing != 0 || r.Extra != 0 {
		t.Errorf("un verbe inconnu consomme quand même une valeur, comme dans fmt : Missing=%d Extra=%d, attendu 0 et 0", r.Missing, r.Extra)
	}
}

func TestOK(t *testing.T) {
	if !CheckFormat("%s : %d fichiers", 2).OK() {
		t.Error("un format correct doit donner OK() == true")
	}
	for _, c := range []struct {
		f string
		n int
	}{{"%s : %d", 1}, {"%d%", 1}, {"%k", 1}, {"fini", 1}} {
		if CheckFormat(c.f, c.n).OK() {
			t.Errorf("CheckFormat(%q, %d).OK() = true, attendu false", c.f, c.n)
		}
	}
}
