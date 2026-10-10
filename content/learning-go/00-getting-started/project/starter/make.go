// Package lab est un mini make : il lit un Makefile, planifie les cibles et les exécute.
package lab

import "errors"

var (
	ErrMissingSeparator = errors.New("missing separator (les commandes s'indentent avec une tabulation)")
	ErrUnknownTarget    = errors.New("no rule to make target")
	ErrCycle            = errors.New("circular dependency")
)

// Target est une cible : ses dépendances et ses commandes, dans l'ordre du fichier.
type Target struct {
	Name     string
	Deps     []string
	Commands []string
}

// Makefile est le résultat de Parse.
type Makefile struct {
	Default string            // .DEFAULT_GOAL, sinon la première cible
	Phony   []string          // cibles déclarées dans .PHONY
	Targets map[string]Target // par nom
}

// Parse lit le texte d'un Makefile.
func Parse(src string) (Makefile, error) {
	// TODO (jalon 1)
	return Makefile{}, nil
}

// Plan renvoie les cibles à exécuter pour goal ("" = cible par défaut) :
// les dépendances d'abord, chacune une seule fois.
func (m Makefile) Plan(goal string) ([]string, error) {
	// TODO (jalon 2)
	return nil, nil
}

// Run exécute les commandes du plan avec exec, dans l'ordre, et s'arrête à la première erreur.
// Elle renvoie les commandes lancées, y compris celle qui a échoué.
func (m Makefile) Run(goal string, exec func(cmd string) error) ([]string, error) {
	// TODO (jalon 3)
	return nil, nil
}
