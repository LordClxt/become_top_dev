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
	for _, name := range names {
		if name == "" {
			return log, ErrEmptyName
		}
		log = append(log, "open "+name)
		defer func(n string) { // n est évalué maintenant, la fermeture s'exécutera à la sortie
			log = append(log, "close "+n)
		}(name)
	}
	log = append(log, "work")
	return log, nil
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
	tx, err := begin()
	if err != nil {
		return err
	}

	finished := false
	rollback := func() {
		if rollbackErr := tx.Rollback(); rollbackErr != nil {
			err = errors.Join(err, rollbackErr)
		}
	}
	defer func() {
		switch {
		case !finished: // work a paniqué : err n'a pas été affectée, la panique continue après ce defer
			_ = tx.Rollback()
		case err != nil:
			rollback()
		default:
			if err = tx.Commit(); err != nil {
				rollback()
			}
		}
	}()

	err = work(tx)
	finished = true
	return err
}
