package lab

import (
	"errors"
	"fmt"
	"maps"
	"slices"
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
	switch {
	case name == "":
		return ErrEmptyName
	case job == nil:
		return fmt.Errorf("%w : %q", ErrNilJob, name)
	}
	if _, exists := registry[name]; exists {
		return fmt.Errorf("%w : %q", ErrDuplicateJob, name)
	}
	registry[name] = job
	return nil
}

// Run exécute le job name avec args.
func Run(registry map[string]Job, name string, args ...string) (string, error) {
	job, ok := registry[name]
	if !ok {
		return "", fmt.Errorf("%w : %q", ErrUnknownJob, name)
	}
	return job(args)
}

// Names renvoie les noms enregistrés, triés.
func Names(registry map[string]Job) []string {
	return slices.Sorted(maps.Keys(registry))
}

// Decorator enveloppe un Job pour lui ajouter un comportement (jalon 2).
type Decorator func(Job) Job

// WithRetry relance le job jusqu'à attempts essais au total (au moins un) et renvoie le premier succès
// ou l'erreur du dernier essai.
func WithRetry(attempts int) Decorator {
	attempts = max(attempts, 1)
	return func(next Job) Job {
		return func(args []string) (output string, err error) {
			for i := 0; i < attempts; i++ {
				if output, err = next(args); err == nil {
					return output, nil
				}
			}
			return "", err
		}
	}
}

// WithDefaults place defaults devant les arguments reçus. Chaque appel reçoit un tableau neuf :
// ni les defaults de l'appelant, ni les arguments d'un appel précédent ne sont jamais partagés.
func WithDefaults(defaults ...string) Decorator {
	defaults = slices.Clone(defaults)
	return func(next Job) Job {
		return func(args []string) (string, error) {
			merged := make([]string, 0, len(defaults)+len(args))
			merged = append(merged, defaults...)
			merged = append(merged, args...)
			return next(merged)
		}
	}
}

// MapOutput transforme la sortie d'un job réussi avec f. Une erreur passe sans modification.
func MapOutput(f func(string) string) Decorator {
	return func(next Job) Job {
		return func(args []string) (string, error) {
			output, err := next(args)
			if err != nil {
				return "", err
			}
			return f(output), nil
		}
	}
}

// Decorate enveloppe job avec les décorateurs. Le premier de la liste est le plus extérieur.
func Decorate(job Job, decorators ...Decorator) Job {
	for i := len(decorators) - 1; i >= 0; i-- {
		job = decorators[i](job)
	}
	return job
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
	output := ""
	for i, step := range steps {
		args := slices.Clone(step.Args)
		if i > 0 {
			args = append(args, output)
		}
		var err error
		if output, err = Run(registry, step.Job, args...); err != nil {
			return "", fmt.Errorf("étape %d (%s) : %w", i+1, step.Job, err)
		}
	}
	return output, nil
}

// Join est un job prêt à l'emploi : il assemble ses arguments avec un espace.
func Join(args []string) (string, error) {
	return strings.Join(args, " "), nil
}
