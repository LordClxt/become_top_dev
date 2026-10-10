package lab

import (
	"errors"
	"fmt"
	"slices"
	"strings"
	"testing"
)

func upperJob(args []string) (string, error) { return strings.ToUpper(strings.Join(args, " ")), nil }

func TestM1RegisterAndRun(t *testing.T) {
	registry := map[string]Job{}
	if err := Register(registry, "echo", Join); err != nil {
		t.Fatal(err)
	}
	if err := Register(registry, "upper", upperJob); err != nil {
		t.Fatal(err)
	}
	if got, err := Run(registry, "echo", "a", "b"); err != nil || got != "a b" {
		t.Errorf("Run(echo) = (%q, %v)", got, err)
	}
	if got, err := Run(registry, "upper", "go", "relay"); err != nil || got != "GO RELAY" {
		t.Errorf("Run(upper) = (%q, %v)", got, err)
	}
	if got, err := Run(registry, "echo"); err != nil || got != "" {
		t.Errorf("Run sans argument = (%q, %v)", got, err)
	}
}

func TestM1RegisterErrors(t *testing.T) {
	registry := map[string]Job{}
	_ = Register(registry, "echo", Join)
	cases := []struct {
		name string
		job  Job
		want error
	}{
		{"", Join, ErrEmptyName},
		{"nil", nil, ErrNilJob},
		{"echo", upperJob, ErrDuplicateJob},
	}
	for _, c := range cases {
		if err := Register(registry, c.name, c.job); !errors.Is(err, c.want) {
			t.Errorf("Register(%q) : erreur %v, attendu %v", c.name, err, c.want)
		}
	}
	if len(registry) != 1 {
		t.Errorf("un enregistrement refusé ne doit rien ajouter : %v", Names(registry))
	}
	// Le doublon ne doit pas avoir écrasé l'original.
	if got, _ := Run(registry, "echo", "x"); got != "x" {
		t.Errorf("le job d'origine a été écrasé : %q", got)
	}
}

func TestM1RunUnknown(t *testing.T) {
	if _, err := Run(map[string]Job{}, "ghost"); !errors.Is(err, ErrUnknownJob) {
		t.Errorf("job inconnu : %v", err)
	}
	if _, err := Run(nil, "ghost"); !errors.Is(err, ErrUnknownJob) {
		t.Errorf("registre nil : %v (lire une map nil est permis)", err)
	}
}

func TestM1Names(t *testing.T) {
	registry := map[string]Job{}
	for _, name := range []string{"zeta", "alpha", "mid", "beta"} {
		_ = Register(registry, name, Join)
	}
	want := []string{"alpha", "beta", "mid", "zeta"}
	for i := 0; i < 20; i++ {
		if got := Names(registry); !slices.Equal(got, want) {
			t.Fatalf("Names = %v, attendu %v (trié, à chaque appel)", got, want)
		}
	}
	if got := Names(nil); len(got) != 0 {
		t.Errorf("Names(nil) = %v", got)
	}
}

func failing(failures int, calls *int) Job {
	return func(args []string) (string, error) {
		*calls++
		if *calls <= failures {
			return "", fmt.Errorf("échec %d", *calls)
		}
		return fmt.Sprintf("ok après %d", *calls), nil
	}
}

func TestM2WithRetry(t *testing.T) {
	calls := 0
	job := Decorate(failing(2, &calls), WithRetry(3))
	if got, err := job(nil); err != nil || got != "ok après 3" || calls != 3 {
		t.Errorf("WithRetry(3) : (%q, %v) après %d appels", got, err, calls)
	}

	calls = 0
	if _, err := Decorate(failing(10, &calls), WithRetry(2))(nil); err == nil || err.Error() != "échec 2" || calls != 2 {
		t.Errorf("trop d'échecs : erreur %v après %d appels, attendu « échec 2 » après 2", err, calls)
	}

	calls = 0
	if _, err := Decorate(failing(10, &calls), WithRetry(0))(nil); err == nil || calls != 1 {
		t.Errorf("WithRetry(0) doit tenter une fois : %d appels", calls)
	}
}

func TestM2WithDefaults(t *testing.T) {
	var received [][]string
	job := func(args []string) (string, error) {
		received = append(received, slices.Clone(args))
		return strings.Join(args, ","), nil
	}
	decorated := Decorate(job, WithDefaults("-v", "--json"))

	if got, _ := decorated([]string{"a"}); got != "-v,--json,a" {
		t.Errorf("WithDefaults = %q", got)
	}
	if got, _ := decorated(nil); got != "-v,--json" {
		t.Errorf("sans argument = %q", got)
	}
}

func TestM2WithDefaultsDoesNotShareMemory(t *testing.T) {
	defaults := []string{"-v", "--json"}
	var seen []string
	job := func(args []string) (string, error) {
		seen = append(seen, strings.Join(args, ","))
		args[0] = "MODIFIÉ" // un job a le droit de modifier ses arguments
		_ = append(args, "extra")
		return "", nil
	}
	decorated := Decorate(job, WithDefaults(defaults...))
	defaults[0] = "ALTÉRÉ" // l'appelant réutilise sa slice après coup

	decorated([]string{"a"})
	decorated([]string{"b"})
	if want := []string{"-v,--json,a", "-v,--json,b"}; !slices.Equal(seen, want) {
		t.Errorf("les jobs ont reçu %v, attendu %v — copie les defaults à la création, et construis un tableau neuf à chaque appel", seen, want)
	}
}

func TestM2MapOutput(t *testing.T) {
	job := Decorate(Join, MapOutput(strings.ToUpper))
	if got, err := job([]string{"go", "go"}); err != nil || got != "GO GO" {
		t.Errorf("MapOutput = (%q, %v)", got, err)
	}
	boom := errors.New("boom")
	failingJob := Decorate(func([]string) (string, error) { return "x", boom }, MapOutput(strings.ToUpper))
	if got, err := failingJob(nil); err != boom || got != "" {
		t.Errorf("une erreur doit passer inchangée, sans sortie : (%q, %v)", got, err)
	}
}

func TestM2DecorateOrder(t *testing.T) {
	var trace []string
	tag := func(name string) Decorator {
		return func(next Job) Job {
			return func(args []string) (string, error) {
				trace = append(trace, name+">")
				out, err := next(args)
				trace = append(trace, "<"+name)
				return out, err
			}
		}
	}
	job := Decorate(func([]string) (string, error) { trace = append(trace, "job"); return "", nil }, tag("A"), tag("B"))
	_, _ = job(nil)
	if want := []string{"A>", "B>", "job", "<B", "<A"}; !slices.Equal(trace, want) {
		t.Errorf("ordre = %v, attendu %v (le premier décorateur est le plus extérieur)", trace, want)
	}
	if got, _ := Decorate(Join)([]string{"x"}); got != "x" {
		t.Errorf("Decorate sans décorateur doit renvoyer le job tel quel")
	}
}

func pipeRegistry() map[string]Job {
	registry := map[string]Job{}
	_ = Register(registry, "join", Join)
	_ = Register(registry, "upper", upperJob)
	_ = Register(registry, "fail", func([]string) (string, error) { return "", errors.New("explosion") })
	_ = Register(registry, "wrap", func(args []string) (string, error) { return "[" + strings.Join(args, "|") + "]", nil })
	return registry
}

func TestM3Pipe(t *testing.T) {
	registry := pipeRegistry()
	got, err := Pipe(registry, []Step{
		{Job: "join", Args: []string{"hello", "world"}},
		{Job: "upper"},
		{Job: "wrap", Args: []string{"x"}},
	})
	if err != nil || got != "[x|HELLO WORLD]" {
		t.Errorf("Pipe = (%q, %v), attendu \"[x|HELLO WORLD]\" — la sortie de l'étape précédente est le DERNIER argument", got, err)
	}
	if got, err := Pipe(registry, []Step{{Job: "join", Args: []string{"seul"}}}); err != nil || got != "seul" {
		t.Errorf("une seule étape : (%q, %v)", got, err)
	}
	if got, err := Pipe(registry, nil); err != nil || got != "" {
		t.Errorf("pipeline vide : (%q, %v)", got, err)
	}
}

func TestM3PipeErrors(t *testing.T) {
	registry := pipeRegistry()
	_, err := Pipe(registry, []Step{{Job: "join", Args: []string{"a"}}, {Job: "fail"}, {Job: "upper"}})
	if err == nil || !strings.Contains(err.Error(), "étape 2 (fail)") || !strings.Contains(err.Error(), "explosion") {
		t.Errorf("erreur = %v, attendu un message qui cite « étape 2 (fail) » et la cause", err)
	}
	if _, err := Pipe(registry, []Step{{Job: "join"}, {Job: "ghost"}}); !errors.Is(err, ErrUnknownJob) {
		t.Errorf("job inconnu dans un pipeline : %v — enveloppe avec %%w pour garder errors.Is", err)
	}

	// Le pipeline s'arrête à la première erreur : l'étape suivante n'est pas lancée.
	ran := false
	_ = Register(registry, "spy", func([]string) (string, error) { ran = true; return "", nil })
	_, _ = Pipe(registry, []Step{{Job: "fail"}, {Job: "spy"}})
	if ran {
		t.Errorf("l'étape après l'erreur ne doit pas s'exécuter")
	}
}

func TestM3PipeDoesNotModifyStepArgs(t *testing.T) {
	registry := pipeRegistry()
	args := make([]string, 1, 5) // de la capacité libre : append écraserait le tableau partagé
	args[0] = "base"
	steps := []Step{{Job: "join", Args: []string{"a"}}, {Job: "wrap", Args: args}}
	for i := 0; i < 2; i++ {
		if got, _ := Pipe(registry, steps); got != "[base|a]" {
			t.Fatalf("appel %d : %q, attendu [base|a]", i+1, got)
		}
	}
	if len(steps[1].Args) != 1 || args[:2][1] != "" {
		t.Errorf("Pipe a modifié les Args de l'étape (ou le tableau derrière) : copie avant d'ajouter la sortie précédente")
	}
}

func TestM3PipeWithDecorators(t *testing.T) {
	registry := pipeRegistry()
	calls := 0
	_ = Register(registry, "flaky", Decorate(failing(1, &calls), WithRetry(2)))
	got, err := Pipe(registry, []Step{{Job: "join", Args: []string{"x"}}, {Job: "flaky"}})
	if err != nil || got != "ok après 2" || calls != 2 {
		t.Errorf("un job décoré dans un pipeline : (%q, %v), %d appels", got, err, calls)
	}
}
