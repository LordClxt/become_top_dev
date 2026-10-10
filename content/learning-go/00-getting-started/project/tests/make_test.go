package lab

import (
	"errors"
	"slices"
	"strings"
	"testing"
)

// Le Makefile du chapitre, tel quel (remarque : pas d'espace après .PHONY:).
const bookMakefile = `.DEFAULT_GOAL := build
.PHONY:fmt vet build

fmt:
	go fmt ./...

vet: fmt
	go vet ./...

build: vet
	go build
`

func mustParse(t *testing.T, src string) Makefile {
	t.Helper()
	m, err := Parse(src)
	if err != nil {
		t.Fatalf("Parse : erreur inattendue : %v", err)
	}
	return m
}

func TestM1Parse(t *testing.T) {
	m := mustParse(t, bookMakefile)
	if m.Default != "build" {
		t.Errorf("Default = %q, attendu \"build\" (.DEFAULT_GOAL)", m.Default)
	}
	if !slices.Equal(m.Phony, []string{"fmt", "vet", "build"}) {
		t.Errorf("Phony = %q, attendu [fmt vet build]", m.Phony)
	}
	vet, ok := m.Targets["vet"]
	if !ok {
		t.Fatalf("la cible vet est absente de Targets (%d cibles trouvées)", len(m.Targets))
	}
	if vet.Name != "vet" || !slices.Equal(vet.Deps, []string{"fmt"}) || !slices.Equal(vet.Commands, []string{"go vet ./..."}) {
		t.Errorf("Targets[\"vet\"] = %+v, attendu {Name:vet Deps:[fmt] Commands:[go vet ./...]}", vet)
	}
	if fmtT := m.Targets["fmt"]; len(fmtT.Deps) != 0 {
		t.Errorf("fmt n'a pas de dépendance, Deps = %q", fmtT.Deps)
	}
}

func TestM1DefaultIsFirstTarget(t *testing.T) {
	m := mustParse(t, "# commentaire\n\nall: test\n\techo all\n\ntest:\n\tgo test ./...\n\tgo vet ./...\n")
	if m.Default != "all" {
		t.Errorf("sans .DEFAULT_GOAL, Default = %q, attendu la première cible \"all\"", m.Default)
	}
	if got := m.Targets["test"].Commands; !slices.Equal(got, []string{"go test ./...", "go vet ./..."}) {
		t.Errorf("Targets[\"test\"].Commands = %q, attendu les deux commandes, sans la tabulation", got)
	}
}

func TestM1MissingSeparator(t *testing.T) {
	_, err := Parse("build:\n    go build\n")
	if !errors.Is(err, ErrMissingSeparator) {
		t.Fatalf("une commande indentée avec des espaces doit renvoyer ErrMissingSeparator, obtenu %v", err)
	}
	if !strings.Contains(err.Error(), "2") {
		t.Errorf("l'erreur doit citer le numéro de ligne (2) : %q", err.Error())
	}
	if _, err := Parse("\tgo build\n"); !errors.Is(err, ErrMissingSeparator) {
		t.Errorf("une commande avant toute cible doit renvoyer ErrMissingSeparator, obtenu %v", err)
	}
}

func TestM2PlanOrder(t *testing.T) {
	m := mustParse(t, bookMakefile)
	cases := map[string][]string{
		"":      {"fmt", "vet", "build"},
		"build": {"fmt", "vet", "build"},
		"vet":   {"fmt", "vet"},
		"fmt":   {"fmt"},
	}
	for goal, want := range cases {
		got, err := m.Plan(goal)
		if err != nil || !slices.Equal(got, want) {
			t.Errorf("Plan(%q) = %q, %v ; attendu %q — les dépendances passent avant la cible", goal, got, err, want)
		}
	}
}

func TestM2PlanDiamond(t *testing.T) {
	src := "release: test build\n\techo release\ntest: gen\n\tgo test ./...\nbuild: gen\n\tgo build\ngen:\n\tgo generate ./...\n"
	got, err := mustParse(t, src).Plan("release")
	want := []string{"gen", "test", "build", "release"}
	if err != nil || !slices.Equal(got, want) {
		t.Errorf("Plan(\"release\") = %q, %v ; attendu %q — gen n'est exécutée qu'une fois", got, err, want)
	}
}

func TestM2PlanErrors(t *testing.T) {
	m := mustParse(t, bookMakefile)
	if _, err := m.Plan("deploy"); !errors.Is(err, ErrUnknownTarget) {
		t.Errorf("Plan(\"deploy\") doit renvoyer ErrUnknownTarget, obtenu %v", err)
	}
	cyc := mustParse(t, "a: b\n\techo a\nb: c\n\techo b\nc: a\n\techo c\n")
	if _, err := cyc.Plan("a"); !errors.Is(err, ErrCycle) {
		t.Errorf("a → b → c → a doit renvoyer ErrCycle, obtenu %v", err)
	}
	bad := mustParse(t, "build: generate\n\tgo build\n")
	if _, err := bad.Plan("build"); !errors.Is(err, ErrUnknownTarget) {
		t.Errorf("une dépendance inconnue doit renvoyer ErrUnknownTarget, obtenu %v", err)
	}
}

func TestM3Run(t *testing.T) {
	m := mustParse(t, bookMakefile)
	var seen []string
	ran, err := m.Run("", func(cmd string) error { seen = append(seen, cmd); return nil })
	want := []string{"go fmt ./...", "go vet ./...", "go build"}
	if err != nil || !slices.Equal(ran, want) || !slices.Equal(seen, want) {
		t.Errorf("Run(\"\") = %q, %v (exec a vu %q) ; attendu %q", ran, err, seen, want)
	}
}

func TestM3RunStopsAtFirstFailure(t *testing.T) {
	m := mustParse(t, bookMakefile)
	boom := errors.New("fmt.Printf format %s reads arg #1, but call has 0 args")
	ran, err := m.Run("build", func(cmd string) error {
		if strings.HasPrefix(cmd, "go vet") {
			return boom
		}
		return nil
	})
	if !errors.Is(err, boom) {
		t.Errorf("Run doit renvoyer l'erreur de la commande (enveloppée avec %%w), obtenu %v", err)
	}
	if want := []string{"go fmt ./...", "go vet ./..."}; !slices.Equal(ran, want) {
		t.Errorf("commandes lancées = %q, attendu %q — build ne doit jamais tourner après l'échec de vet", ran, want)
	}
	if err != nil && !strings.Contains(err.Error(), "vet") {
		t.Errorf("l'erreur doit nommer la cible en échec (vet) : %q", err.Error())
	}
}

func TestM3RunUnknownTarget(t *testing.T) {
	m := mustParse(t, bookMakefile)
	called := false
	if _, err := m.Run("deploy", func(string) error { called = true; return nil }); !errors.Is(err, ErrUnknownTarget) || called {
		t.Errorf("Run(\"deploy\") doit renvoyer ErrUnknownTarget sans rien exécuter (err=%v, exec appelé=%v)", err, called)
	}
}
