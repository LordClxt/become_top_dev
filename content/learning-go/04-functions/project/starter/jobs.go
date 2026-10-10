package lab

import (
	"errors"
	"strings"
)

var (
	ErrEmptyName    = errors.New("nom de job vide")
	ErrNilJob       = errors.New("job nil")
	ErrDuplicateJob = errors.New("job déjà enregistré")
	ErrUnknownJob   = errors.New("job inconnu")
)

// Job est une tâche de Relay : elle reçoit des arguments et renvoie un résultat.
type Job func(args []string) (string, error)

// Register ajoute job à registry sous le nom name (jalon 1).
func Register(registry map[string]Job, name string, job Job) error {
	// TODO
	panic("à implémenter")
}

// Run exécute le job name avec args.
func Run(registry map[string]Job, name string, args ...string) (string, error) {
	// TODO
	panic("à implémenter")
}

// Names renvoie les noms enregistrés, triés.
func Names(registry map[string]Job) []string {
	// TODO
	panic("à implémenter")
}

// Decorator enveloppe un Job pour lui ajouter un comportement (jalon 2).
type Decorator func(Job) Job

// WithRetry relance le job jusqu'à attempts essais au total (au moins un) et renvoie le premier succès
// ou l'erreur du dernier essai.
func WithRetry(attempts int) Decorator {
	// TODO
	panic("à implémenter")
}

// WithDefaults place defaults devant les arguments reçus. Chaque appel reçoit un tableau neuf :
// ni les defaults de l'appelant, ni les arguments d'un appel précédent ne sont jamais partagés.
func WithDefaults(defaults ...string) Decorator {
	// TODO
	panic("à implémenter")
}

// MapOutput transforme la sortie d'un job réussi avec f. Une erreur passe sans modification.
func MapOutput(f func(string) string) Decorator {
	// TODO
	panic("à implémenter")
}

// Decorate enveloppe job avec les décorateurs. Le premier de la liste est le plus extérieur.
func Decorate(job Job, decorators ...Decorator) Job {
	// TODO
	panic("à implémenter")
}

// Step est une étape d'un pipeline : un job et ses arguments propres.
type Step struct {
	Job  string
	Args []string
}

// Pipe exécute les étapes dans l'ordre (jalon 3). Chaque étape reçoit ses Args, suivis, sauf la première,
// de la sortie de l'étape précédente comme dernier argument. Pipe renvoie la sortie de la dernière étape.
// À la première erreur, l'exécution s'arrête et l'erreur est enveloppée avec le numéro et le nom de l'étape (%w).
func Pipe(registry map[string]Job, steps []Step) (string, error) {
	// TODO
	panic("à implémenter")
}

// Join est un job prêt à l'emploi : il assemble ses arguments avec un espace.
func Join(args []string) (string, error) {
	return strings.Join(args, " "), nil
}
