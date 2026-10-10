package lab

import "testing"

func TestSummary(t *testing.T) {
	if got, want := Summary("relay", 3), "relay : 3 fichiers"; got != want {
		t.Errorf("Summary(\"relay\", 3) = %q, attendu %q — chaque verbe %% a-t-il sa valeur ?", got, want)
	}
}

func TestDuration(t *testing.T) {
	if got, want := Duration(120), "durée : 120 ms"; got != want {
		t.Errorf("Duration(120) = %q, attendu %q — quel verbe affiche un entier ?", got, want)
	}
}

func TestStatus(t *testing.T) {
	cases := map[bool]string{true: "statut : ok", false: "statut : échec"}
	for ok, want := range cases {
		if got := Status(ok); got != want {
			t.Errorf("Status(%v) = %q, attendu %q — Sprint ne comprend pas les verbes, Sprintf si", ok, got, want)
		}
	}
}

func TestPercent(t *testing.T) {
	cases := []struct {
		done, total int
		want        string
	}{
		{3, 4, "75%"},
		{0, 10, "0%"},
		{10, 10, "100%"},
		{1, 3, "33%"},
	}
	for _, c := range cases {
		if got := Percent(c.done, c.total); got != c.want {
			t.Errorf("Percent(%d, %d) = %q, attendu %q — comment écrire un %% littéral dans un format ?", c.done, c.total, got, c.want)
		}
	}
}
