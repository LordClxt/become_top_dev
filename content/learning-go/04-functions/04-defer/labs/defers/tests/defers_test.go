package lab

import (
	"errors"
	"slices"
	"testing"
)

func TestSession(t *testing.T) {
	cases := []struct {
		name  string
		names []string
		want  []string
	}{
		{"deux ressources", []string{"a", "b"}, []string{"open a", "open b", "work", "close b", "close a"}},
		{"une ressource", []string{"x"}, []string{"open x", "work", "close x"}},
		{"trois ressources", []string{"db", "cache", "queue"}, []string{"open db", "open cache", "open queue", "work", "close queue", "close cache", "close db"}},
		{"aucune ressource", nil, []string{"work"}},
	}
	for _, c := range cases {
		got, err := Session(c.names)
		if err != nil || !slices.Equal(got, c.want) {
			t.Errorf("%s : Session(%v) = (%v, %v), attendu (%v, nil) — les fermetures doivent apparaître dans l'ordre inverse, après « work »", c.name, c.names, got, err, c.want)
		}
	}
}

func TestSessionClosesWhatWasOpenedOnError(t *testing.T) {
	got, err := Session([]string{"a", "b", "", "d"})
	want := []string{"open a", "open b", "close b", "close a"}
	if !errors.Is(err, ErrEmptyName) || !slices.Equal(got, want) {
		t.Errorf("Session avec un nom vide = (%v, %v), attendu (%v, ErrEmptyName) — « work » est ignoré mais a et b doivent être fermées en ordre inverse", got, err, want)
	}
	got, err = Session([]string{""})
	if !errors.Is(err, ErrEmptyName) || len(got) != 0 {
		t.Errorf("Session([\"\"]) = (%v, %v), attendu (vide, ErrEmptyName)", got, err)
	}
}

// fakeTx enregistre les appels reçus.
type fakeTx struct {
	calls       []string
	commitErr   error
	rollbackErr error
}

func (f *fakeTx) tx() Tx {
	return Tx{
		Commit:   func() error { f.calls = append(f.calls, "commit"); return f.commitErr },
		Rollback: func() error { f.calls = append(f.calls, "rollback"); return f.rollbackErr },
	}
}

func begin(f *fakeTx) func() (Tx, error) {
	return func() (Tx, error) { f.calls = append(f.calls, "begin"); return f.tx(), nil }
}

func TestWithTxCommitsOnSuccess(t *testing.T) {
	f := &fakeTx{}
	err := WithTx(begin(f), func(tx Tx) error { f.calls = append(f.calls, "work"); return nil })
	if err != nil || !slices.Equal(f.calls, []string{"begin", "work", "commit"}) {
		t.Errorf("succès : err = %v, appels = %v, attendu [begin work commit]", err, f.calls)
	}
}

func TestWithTxRollsBackOnWorkError(t *testing.T) {
	f := &fakeTx{}
	boom := errors.New("boom")
	err := WithTx(begin(f), func(tx Tx) error { f.calls = append(f.calls, "work"); return boom })
	if err != boom {
		t.Errorf("l'erreur de work doit être renvoyée telle quelle quand l'annulation réussit : %v", err)
	}
	if !slices.Equal(f.calls, []string{"begin", "work", "rollback"}) {
		t.Errorf("appels = %v, attendu [begin work rollback] : jamais de commit après une erreur", f.calls)
	}
}

func TestWithTxCommitFailureRollsBack(t *testing.T) {
	f := &fakeTx{commitErr: errors.New("commit impossible")}
	err := WithTx(begin(f), func(tx Tx) error { return nil })
	if !errors.Is(err, f.commitErr) {
		t.Errorf("l'erreur du Commit doit être renvoyée : %v", err)
	}
	if !slices.Equal(f.calls, []string{"begin", "commit", "rollback"}) {
		t.Errorf("appels = %v, attendu [begin commit rollback]", f.calls)
	}
}

func TestWithTxJoinsRollbackError(t *testing.T) {
	f := &fakeTx{rollbackErr: errors.New("rollback impossible")}
	boom := errors.New("boom")
	err := WithTx(begin(f), func(tx Tx) error { return boom })
	if !errors.Is(err, boom) || !errors.Is(err, f.rollbackErr) {
		t.Errorf("les deux erreurs doivent être présentes (errors.Join) : %v", err)
	}
}

func TestWithTxBeginFailure(t *testing.T) {
	var called []string
	beginErr := errors.New("connexion refusée")
	err := WithTx(
		func() (Tx, error) { called = append(called, "begin"); return Tx{}, beginErr },
		func(tx Tx) error { called = append(called, "work"); return nil },
	)
	if err != beginErr || !slices.Equal(called, []string{"begin"}) {
		t.Errorf("begin en échec : err = %v, appels = %v, attendu seulement begin", err, called)
	}
}

func TestWithTxRollsBackOnPanic(t *testing.T) {
	f := &fakeTx{}
	var recovered any
	func() {
		defer func() { recovered = recover() }()
		_ = WithTx(begin(f), func(tx Tx) error { panic("catastrophe") })
	}()
	if recovered != "catastrophe" {
		t.Errorf("la panique doit continuer après le nettoyage, recover() = %v", recovered)
	}
	if !slices.Equal(f.calls, []string{"begin", "rollback"}) {
		t.Errorf("appels = %v, attendu [begin rollback] : un defer s'exécute aussi pendant une panique, et il ne faut surtout pas valider", f.calls)
	}
}
