package lab

import (
	"errors"
	"fmt"
	"slices"
	"testing"
)

func upper(request string) (string, error) { return "OK:" + request, nil }

func TestChainWithoutMiddlewares(t *testing.T) {
	h := Chain(upper)
	if got, err := h("a"); err != nil || got != "OK:a" {
		t.Errorf("Chain(h)(a) = (%q, %v)", got, err)
	}
}

func TestChainOrder(t *testing.T) {
	var trace []string
	tag := func(name string) Middleware {
		return func(next Handler) Handler {
			return func(request string) (string, error) {
				trace = append(trace, name+" avant")
				response, err := next(request)
				trace = append(trace, name+" après")
				return response, err
			}
		}
	}
	h := Chain(func(request string) (string, error) {
		trace = append(trace, "handler")
		return "ok", nil
	}, tag("A"), tag("B"), tag("C"))

	if _, err := h("x"); err != nil {
		t.Fatal(err)
	}
	want := []string{"A avant", "B avant", "C avant", "handler", "C après", "B après", "A après"}
	if !slices.Equal(trace, want) {
		t.Errorf("ordre d'exécution :\n   reçu    %v\n   attendu %v\n(le premier middleware de la liste est le plus extérieur)", trace, want)
	}
}

func TestChainCanBeUsedSeveralTimes(t *testing.T) {
	calls := 0
	h := Chain(func(request string) (string, error) { calls++; return request, nil }, WithPrefix("> "))
	for _, req := range []string{"a", "b", "c"} {
		if got, _ := h(req); got != "> "+req {
			t.Errorf("h(%q) = %q", req, got)
		}
	}
	if calls != 3 {
		t.Errorf("le handler doit être appelé une fois par requête : %d", calls)
	}
}

func TestLogging(t *testing.T) {
	var logs []string
	logf := func(s string) { logs = append(logs, s) }

	h := Chain(upper, Logging(logf))
	if got, err := h("ping"); err != nil || got != "OK:ping" {
		t.Fatalf("la réponse doit passer inchangée : (%q, %v)", got, err)
	}
	if want := []string{"start ping", "end ping ok"}; !slices.Equal(logs, want) {
		t.Errorf("journal = %v, attendu %v", logs, want)
	}

	logs = nil
	boom := errors.New("boom")
	failing := Chain(func(string) (string, error) { return "", boom }, Logging(logf))
	if _, err := failing("x"); err != boom {
		t.Errorf("l'erreur doit passer inchangée : %v", err)
	}
	if want := []string{"start x", "end x error: boom"}; !slices.Equal(logs, want) {
		t.Errorf("journal en cas d'erreur = %v, attendu %v", logs, want)
	}
}

func flaky(failures int) (Handler, *int) {
	calls := 0
	return func(request string) (string, error) {
		calls++
		if calls <= failures {
			return "", fmt.Errorf("échec %d", calls)
		}
		return "réussi après " + fmt.Sprint(calls), nil
	}, &calls
}

func TestRetry(t *testing.T) {
	cases := []struct {
		name       string
		attempts   int
		failures   int
		wantCalls  int
		wantResp   string
		wantErrMsg string
	}{
		{"réussit du premier coup", 3, 0, 1, "réussi après 1", ""},
		{"réussit au dernier essai", 3, 2, 3, "réussi après 3", ""},
		{"échoue tout le temps : dernière erreur", 3, 10, 3, "", "échec 3"},
		{"un seul essai", 1, 5, 1, "", "échec 1"},
		{"zéro essai = un essai", 0, 5, 1, "", "échec 1"},
		{"négatif = un essai", -4, 5, 1, "", "échec 1"},
	}
	for _, c := range cases {
		h, calls := flaky(c.failures)
		got, err := Chain(h, Retry(c.attempts))("req")
		if *calls != c.wantCalls || got != c.wantResp || (err == nil) != (c.wantErrMsg == "") || (err != nil && err.Error() != c.wantErrMsg) {
			t.Errorf("%s : (%q, %v) après %d appels, attendu (%q, %q) après %d appels", c.name, got, err, *calls, c.wantResp, c.wantErrMsg, c.wantCalls)
		}
	}
}

func TestWithPrefix(t *testing.T) {
	h := Chain(upper, WithPrefix("# "))
	if got, err := h("a"); err != nil || got != "# OK:a" {
		t.Errorf("WithPrefix = (%q, %v)", got, err)
	}
	boom := errors.New("boom")
	failing := Chain(func(string) (string, error) { return "ignorée", boom }, WithPrefix("# "))
	if got, err := failing("a"); err != boom || got != "" {
		t.Errorf("en cas d'erreur : (%q, %v), attendu (\"\", boom) — pas de préfixe sur une erreur", got, err)
	}
}

func TestValidate(t *testing.T) {
	errEmpty := errors.New("requête vide")
	calls := 0
	h := Chain(func(r string) (string, error) { calls++; return r, nil }, Validate(func(r string) error {
		if r == "" {
			return errEmpty
		}
		return nil
	}))
	if got, err := h("ok"); err != nil || got != "ok" || calls != 1 {
		t.Errorf("requête valide : (%q, %v), appels %d", got, err, calls)
	}
	if got, err := h(""); err != errEmpty || got != "" || calls != 1 {
		t.Errorf("requête invalide : (%q, %v), appels %d — le handler ne doit pas être appelé", got, err, calls)
	}
}

func TestMiddlewaresCompose(t *testing.T) {
	var logs []string
	logf := func(s string) { logs = append(logs, s) }
	handler, calls := flaky(1)

	h := Chain(handler,
		Logging(logf), // extérieur : journalise une seule fois pour l'ensemble
		Validate(func(r string) error {
			if r == "" {
				return errors.New("vide")
			}
			return nil
		}),
		Retry(2),
		WithPrefix("# "),
	)
	got, err := h("job")
	if err != nil || got != "# réussi après 2" {
		t.Errorf("(%q, %v)", got, err)
	}
	if *calls != 2 {
		t.Errorf("le handler a été appelé %d fois, attendu 2 (un échec, un succès)", *calls)
	}
	if want := []string{"start job", "end job ok"}; !slices.Equal(logs, want) {
		t.Errorf("Logging est le plus extérieur : un seul start/end pour les deux essais, reçu %v", logs)
	}
}
