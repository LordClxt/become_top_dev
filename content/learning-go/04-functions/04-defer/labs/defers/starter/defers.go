package lab

import "errors"

// ErrEmptyName est renvoyée par Session quand un nom de ressource est vide.
var ErrEmptyName = errors.New("nom de ressource vide")

// Session ouvre les ressources names dans l'ordre, puis « travaille », puis les ferme dans l'ordre inverse.
// Le journal contient « open X » à chaque ouverture, « work » une fois tout ouvert, et « close X » à chaque fermeture.
//
// Si un nom est vide, l'ouverture s'arrête avec ErrEmptyName : les ressources déjà ouvertes sont quand même
// fermées, dans l'ordre inverse, et « work » n'est pas exécuté.
func Session(names []string) (log []string, err error) {
	// TODO : un defer par ressource ouverte, qui ajoute « close X » au journal
	panic("à implémenter")
}

// Tx représente une transaction.
type Tx struct {
	Commit   func() error
	Rollback func() error
}

// WithTx ouvre une transaction avec begin, exécute work, puis :
//   - si work réussit, valide avec Commit ; si Commit échoue, annule avec Rollback et renvoie l'erreur de Commit ;
//   - si work échoue, annule avec Rollback et renvoie l'erreur de work ;
//   - si work panique, annule avec Rollback et laisse la panique continuer.
//
// Si l'annulation échoue aussi, son erreur est ajoutée avec errors.Join. Si begin échoue, rien d'autre n'est appelé.
func WithTx(begin func() (Tx, error), work func(Tx) error) (err error) {
	// TODO : un defer qui lit et modifie err
	panic("à implémenter")
}
