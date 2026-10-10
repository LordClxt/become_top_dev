// Package lab est un mini make : il lit un Makefile, planifie les cibles et les exécute.
package lab

import (
	"errors"
	"fmt"
	"slices"
	"strings"
)

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
	m := Makefile{Targets: map[string]Target{}}
	current := ""
	for n, line := range strings.Split(src, "\n") {
		trimmed := strings.TrimSpace(line)
		switch {
		case trimmed == "" || strings.HasPrefix(trimmed, "#"):
			continue
		case strings.HasPrefix(line, "\t"):
			if current == "" {
				return Makefile{}, fmt.Errorf("ligne %d : commande hors d'une cible : %w", n+1, ErrMissingSeparator)
			}
			t := m.Targets[current]
			t.Commands = append(t.Commands, trimmed)
			m.Targets[current] = t
		case strings.HasPrefix(line, " "):
			return Makefile{}, fmt.Errorf("ligne %d : %w", n+1, ErrMissingSeparator)
		case strings.HasPrefix(trimmed, ".DEFAULT_GOAL"):
			_, goal, _ := strings.Cut(trimmed, ":=")
			m.Default = strings.TrimSpace(goal)
		default:
			name, deps, ok := strings.Cut(trimmed, ":")
			if !ok {
				return Makefile{}, fmt.Errorf("ligne %d : %w", n+1, ErrMissingSeparator)
			}
			name = strings.TrimSpace(name)
			if name == ".PHONY" {
				m.Phony = append(m.Phony, strings.Fields(deps)...)
				continue
			}
			if m.Default == "" && len(m.Targets) == 0 {
				m.Default = name
			}
			m.Targets[name] = Target{Name: name, Deps: strings.Fields(deps)}
			current = name
		}
	}
	return m, nil
}

// Plan renvoie les cibles à exécuter pour goal ("" = cible par défaut) :
// les dépendances d'abord, chacune une seule fois.
func (m Makefile) Plan(goal string) ([]string, error) {
	if goal == "" {
		goal = m.Default
	}
	var order []string
	var visit func(name string, path []string) error
	visit = func(name string, path []string) error {
		if slices.Contains(path, name) {
			return fmt.Errorf("%s -> %s : %w", strings.Join(path, " -> "), name, ErrCycle)
		}
		if slices.Contains(order, name) {
			return nil
		}
		t, ok := m.Targets[name]
		if !ok {
			return fmt.Errorf("%q : %w", name, ErrUnknownTarget)
		}
		for _, dep := range t.Deps {
			if err := visit(dep, append(path, name)); err != nil {
				return err
			}
		}
		order = append(order, name)
		return nil
	}
	if err := visit(goal, nil); err != nil {
		return nil, err
	}
	return order, nil
}

// Run exécute les commandes du plan avec exec, dans l'ordre, et s'arrête à la première erreur.
// Elle renvoie les commandes lancées, y compris celle qui a échoué.
func (m Makefile) Run(goal string, exec func(cmd string) error) ([]string, error) {
	plan, err := m.Plan(goal)
	if err != nil {
		return nil, err
	}
	var ran []string
	for _, name := range plan {
		for _, cmd := range m.Targets[name].Commands {
			ran = append(ran, cmd)
			if err := exec(cmd); err != nil {
				return ran, fmt.Errorf("[%s] %w", name, err)
			}
		}
	}
	return ran, nil
}
