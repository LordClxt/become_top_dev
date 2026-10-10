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
	// TODO
	panic("à implémenter")
}

// Deposit ajoute amount au solde de a (a est modifié : c'est ce que dit le pointeur).
func Deposit(a *Account, amount int) error {
	// TODO
	panic("à implémenter")
}

// Withdraw retire amount du solde de a.
func Withdraw(a *Account, amount int) error {
	// TODO
	panic("à implémenter")
}

// Transfer déplace amount de from vers to. Les vérifications se font dans cet ordre : un compte nil,
// le même compte des deux côtés, un montant invalide, un solde insuffisant.
// En cas d'erreur, aucun des deux comptes n'est modifié.
func Transfer(from, to *Account, amount int) error {
	// TODO
	panic("à implémenter")
}

// Ensure renvoie a, ou un nouveau compte vide si a est nil.
// Une fonction ne peut pas rendre non nil le pointeur de l'appelant : elle doit le renvoyer.
func Ensure(a *Account) *Account {
	// TODO
	panic("à implémenter")
}

// Snapshot renvoie une copie de a. ok vaut false si a est nil.
func Snapshot(a *Account) (snap Account, ok bool) {
	// TODO
	panic("à implémenter")
}
