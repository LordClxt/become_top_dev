package lab

import "testing"

func TestGrade(t *testing.T) {
	cases := map[int]string{
		100: "A", 95: "A", 90: "A", 89: "B", 80: "B", 79: "C", 70: "C", 69: "D", 60: "D", 59: "F", 0: "F",
		-1: "invalid", 101: "invalid", -100: "invalid", 1000: "invalid",
	}
	for score, want := range cases {
		if got := Grade(score); got != want {
			t.Errorf("Grade(%d) = %q, attendu %q", score, got, want)
		}
	}
}

func TestRun(t *testing.T) {
	cases := []struct {
		name string
		cmds []string
		want Position
	}{
		{"aucun ordre", nil, Position{0, 0}},
		{"déplacements simples", []string{"up", "up", "right"}, Position{1, 2}},
		{"synonymes", []string{"north", "east", "south", "west", "north"}, Position{0, 1}},
		{"retour en arrière", []string{"left", "left", "down"}, Position{-2, -1}},
		{"reset", []string{"up", "right", "reset", "left"}, Position{-1, 0}},
		{"noop et ordre vide ne font rien", []string{"up", "noop", "", "noop", "up"}, Position{0, 2}},
		{"stop arrête tout", []string{"up", "stop", "up", "right"}, Position{0, 1}},
		{"stop en premier", []string{"stop", "up"}, Position{0, 0}},
		{"stop n'est pas un simple break de switch", []string{"right", "stop", "left", "left", "left"}, Position{1, 0}},
	}
	for _, c := range cases {
		got, err := Run(c.cmds)
		if err != nil || got != c.want {
			t.Errorf("%s : Run(%v) = (%v, %v), attendu (%v, nil)", c.name, c.cmds, got, err, c.want)
		}
	}
}

func TestRunUnknownCommand(t *testing.T) {
	got, err := Run([]string{"up", "up", "jump", "up"})
	if err == nil || err.Error() != `unknown command "jump"` {
		t.Fatalf("erreur %v, attendu `unknown command \"jump\"`", err)
	}
	if got != (Position{0, 2}) {
		t.Errorf("position %v, attendu {0 2} : on conserve la position atteinte avant l'ordre inconnu", got)
	}
	if _, err := Run([]string{"stop", "jump"}); err != nil {
		t.Errorf("après stop, les ordres sont ignorés (même inconnus) : erreur %v", err)
	}
	if _, err := Run([]string{"UP"}); err == nil {
		t.Errorf("les ordres sont sensibles à la casse : UP doit être inconnu")
	}
}

func TestFirstAllPositiveRow(t *testing.T) {
	cases := []struct {
		name string
		grid [][]int
		want int
	}{
		{"première ligne valide", [][]int{{1, 2}, {3, 4}}, 0},
		{"deuxième ligne", [][]int{{1, 0}, {3, 4}}, 1},
		{"troisième ligne après plusieurs rejets", [][]int{{-1, 5}, {5, 5, 0}, {7}}, 2},
		{"aucune", [][]int{{0}, {-1, 2}}, -1},
		{"lignes vides ignorées", [][]int{{}, nil, {2}}, 2},
		{"grille vide", nil, -1},
		{"que des lignes vides", [][]int{{}, {}}, -1},
		{"le dernier élément décide", [][]int{{4, 4, -4}, {1, 1, 1}}, 1},
	}
	for _, c := range cases {
		if got := FirstAllPositiveRow(c.grid); got != c.want {
			t.Errorf("%s : FirstAllPositiveRow(%v) = %d, attendu %d", c.name, c.grid, got, c.want)
		}
	}
}

func TestCountUntilNegative(t *testing.T) {
	cases := []struct {
		name string
		grid [][]int
		want int
	}{
		{"aucune valeur négative", [][]int{{1, 2}, {3}}, 3},
		{"s'arrête à la première négative", [][]int{{1, 2, -1, 9}, {7, 7}}, 2},
		{"arrêt complet, pas seulement de la ligne", [][]int{{1, -1}, {5, 5, 5}}, 1},
		{"les zéros sont ignorés", [][]int{{0, 3, 0, 4}}, 2},
		{"négative en premier", [][]int{{-1, 5}}, 0},
		{"grille vide", nil, 0},
		{"lignes vides", [][]int{{}, {2}, {}}, 1},
	}
	for _, c := range cases {
		if got := CountUntilNegative(c.grid); got != c.want {
			t.Errorf("%s : CountUntilNegative(%v) = %d, attendu %d", c.name, c.grid, got, c.want)
		}
	}
}
