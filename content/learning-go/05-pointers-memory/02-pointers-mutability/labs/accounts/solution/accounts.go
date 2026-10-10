package lab

import "errors"

var (
	ErrNilAccount   = errors.New("compte nil")
	ErrOwner        = errors.New("propriétaire manquant")
	ErrAmount       = errors.New("montant invalide")
	ErrInsufficient = errors.New("solde insuffisant")
	ErrSameAccount  = errors.New("comptes identiques")
)

// Account est un compte bancaire.
type Account struct {
	Owner   string
	Balance int
}

// Open crée un compte. Elle renvoie une valeur, pas un pointeur : l'appelant décide s'il veut en prendre l'adresse.
func Open(owner string, initial int) (Account, error) {
	switch {
	case owner == "":
		return Account{}, ErrOwner
	case initial < 0:
		return Account{}, ErrAmount
	}
	return Account{Owner: owner, Balance: initial}, nil
}

// Deposit ajoute amount au solde de a (a est modifié : c'est ce que dit le pointeur).
func Deposit(a *Account, amount int) error {
	if a == nil {
		return ErrNilAccount
	}
	if amount <= 0 {
		return ErrAmount
	}
	a.Balance += amount
	return nil
}

// Withdraw retire amount du solde de a.
func Withdraw(a *Account, amount int) error {
	if a == nil {
		return ErrNilAccount
	}
	if amount <= 0 {
		return ErrAmount
	}
	if amount > a.Balance {
		return ErrInsufficient
	}
	a.Balance -= amount
	return nil
}

// Transfer déplace amount de from vers to. Les vérifications se font dans cet ordre : un compte nil,
// le même compte des deux côtés, un montant invalide, un solde insuffisant.
// En cas d'erreur, aucun des deux comptes n'est modifié.
func Transfer(from, to *Account, amount int) error {
	switch {
	case from == nil || to == nil:
		return ErrNilAccount
	case from == to:
		return ErrSameAccount
	case amount <= 0:
		return ErrAmount
	case from.Balance < amount:
		return ErrInsufficient
	}
	from.Balance -= amount
	to.Balance += amount
	return nil
}

// Ensure renvoie a, ou un nouveau compte vide si a est nil.
// Une fonction ne peut pas rendre non nil le pointeur de l'appelant : elle doit le renvoyer.
func Ensure(a *Account) *Account {
	if a == nil {
		return &Account{}
	}
	return a
}

// Snapshot renvoie une copie de a. ok vaut false si a est nil.
func Snapshot(a *Account) (snap Account, ok bool) {
	if a == nil {
		return Account{}, false
	}
	return *a, true
}
