package lab

import (
	"errors"
	"testing"
)

func TestOpen(t *testing.T) {
	a, err := Open("ada", 100)
	if err != nil || a != (Account{"ada", 100}) {
		t.Errorf("Open = (%v, %v)", a, err)
	}
	if _, err := Open("", 10); !errors.Is(err, ErrOwner) {
		t.Errorf("propriétaire vide : %v", err)
	}
	if _, err := Open("bob", -1); !errors.Is(err, ErrAmount) {
		t.Errorf("solde initial négatif : %v", err)
	}
	if a, err := Open("zero", 0); err != nil || a.Balance != 0 {
		t.Errorf("un solde initial nul est valide : (%v, %v)", a, err)
	}
}

func TestDeposit(t *testing.T) {
	a := Account{"ada", 100}
	if err := Deposit(&a, 50); err != nil || a.Balance != 150 {
		t.Errorf("Deposit = %v, solde %d — le compte de l'appelant doit être modifié", err, a.Balance)
	}
	for _, amount := range []int{0, -5} {
		if err := Deposit(&a, amount); !errors.Is(err, ErrAmount) || a.Balance != 150 {
			t.Errorf("Deposit(%d) : %v, solde %d, attendu ErrAmount sans modification", amount, err, a.Balance)
		}
	}
	if err := Deposit(nil, 10); !errors.Is(err, ErrNilAccount) {
		t.Errorf("Deposit(nil) : %v", err)
	}
}

func TestWithdraw(t *testing.T) {
	a := Account{"ada", 100}
	if err := Withdraw(&a, 40); err != nil || a.Balance != 60 {
		t.Errorf("Withdraw = %v, solde %d", err, a.Balance)
	}
	if err := Withdraw(&a, 60); err != nil || a.Balance != 0 {
		t.Errorf("retirer tout le solde est permis : %v, solde %d", err, a.Balance)
	}
	if err := Withdraw(&a, 1); !errors.Is(err, ErrInsufficient) || a.Balance != 0 {
		t.Errorf("solde insuffisant : %v, solde %d", err, a.Balance)
	}
	if err := Withdraw(&a, 0); !errors.Is(err, ErrAmount) {
		t.Errorf("montant nul : %v", err)
	}
	if err := Withdraw(nil, 5); !errors.Is(err, ErrNilAccount) {
		t.Errorf("Withdraw(nil) : %v", err)
	}
}

func TestTransfer(t *testing.T) {
	from, to := Account{"a", 100}, Account{"b", 5}
	if err := Transfer(&from, &to, 30); err != nil || from.Balance != 70 || to.Balance != 35 {
		t.Errorf("Transfer = %v, soldes %d et %d, attendu 70 et 35", err, from.Balance, to.Balance)
	}
	if err := Transfer(&from, &to, 70); err != nil || from.Balance != 0 || to.Balance != 105 {
		t.Errorf("transférer tout le solde : %v, soldes %d et %d", err, from.Balance, to.Balance)
	}
}

func TestTransferIsAtomicOnError(t *testing.T) {
	cases := []struct {
		name       string
		from, to   *Account
		amount     int
		want       error
		fromB, toB int
	}{
		{"solde insuffisant", &Account{"a", 10}, &Account{"b", 5}, 11, ErrInsufficient, 10, 5},
		{"montant nul", &Account{"a", 10}, &Account{"b", 5}, 0, ErrAmount, 10, 5},
		{"montant négatif", &Account{"a", 10}, &Account{"b", 5}, -3, ErrAmount, 10, 5},
		{"source nil", nil, &Account{"b", 5}, 1, ErrNilAccount, 0, 5},
		{"destination nil", &Account{"a", 10}, nil, 1, ErrNilAccount, 10, 0},
	}
	for _, c := range cases {
		err := Transfer(c.from, c.to, c.amount)
		if !errors.Is(err, c.want) {
			t.Errorf("%s : erreur %v, attendu %v", c.name, err, c.want)
		}
		if c.from != nil && c.from.Balance != c.fromB {
			t.Errorf("%s : le compte source a été modifié (%d)", c.name, c.from.Balance)
		}
		if c.to != nil && c.to.Balance != c.toB {
			t.Errorf("%s : le compte destination a été modifié (%d)", c.name, c.to.Balance)
		}
	}
}

func TestTransferSameAccount(t *testing.T) {
	a := Account{"a", 100}
	if err := Transfer(&a, &a, 10); !errors.Is(err, ErrSameAccount) || a.Balance != 100 {
		t.Errorf("même compte : %v, solde %d, attendu ErrSameAccount et un solde inchangé", err, a.Balance)
	}
	b := Account{"a", 100} // même contenu mais compte différent : c'est permis
	if err := Transfer(&a, &b, 10); err != nil || a.Balance != 90 || b.Balance != 110 {
		t.Errorf("deux comptes de même contenu mais distincts : %v, %d, %d (compare les pointeurs, pas les valeurs)", err, a.Balance, b.Balance)
	}
}

func TestEnsure(t *testing.T) {
	a := &Account{"ada", 5}
	if Ensure(a) != a {
		t.Errorf("Ensure d'un compte existant doit renvoyer le même pointeur")
	}
	n1, n2 := Ensure(nil), Ensure(nil)
	if n1 == nil || n2 == nil || n1 == n2 || *n1 != (Account{}) {
		t.Errorf("Ensure(nil) doit créer un compte neuf à chaque appel : %v %v", n1, n2)
	}
	n1.Balance = 99
	if n2.Balance != 0 {
		t.Errorf("les comptes créés ne doivent pas être partagés")
	}

	// Le piège : la fonction ne peut pas modifier le pointeur de l'appelant, c'est donc la valeur renvoyée qui compte.
	var mine *Account
	mine = Ensure(mine)
	if mine == nil {
		t.Errorf("l'appelant doit réaffecter le résultat : mine = Ensure(mine)")
	}
}

func TestSnapshot(t *testing.T) {
	a := &Account{"ada", 10}
	snap, ok := Snapshot(a)
	if !ok || snap != *a {
		t.Fatalf("Snapshot = (%v, %v)", snap, ok)
	}
	a.Balance = 999
	if snap.Balance != 10 {
		t.Errorf("la copie ne doit pas suivre l'original : %d", snap.Balance)
	}
	if got, ok := Snapshot(nil); ok || got != (Account{}) {
		t.Errorf("Snapshot(nil) = (%v, %v)", got, ok)
	}
}
