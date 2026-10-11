package lab

import (
	"slices"
	"strings"
	"unicode"
	"unicode/utf8"
)

// Atom est un prédicat appliqué à des arguments : within(idaho, usa).
// Un argument qui commence par une majuscule est une variable ; sinon c'est une constante.
type Atom struct {
	Pred string
	Args []string
}

// Rule signifie « Head est vrai si tous les atomes de Body sont vrais » (Head :- Body[0], Body[1], …).
type Rule struct {
	Head Atom
	Body []Atom
}

// String renvoie la forme canonique « pred(a, b) ».
func (a Atom) String() string {
	return a.Pred + "(" + strings.Join(a.Args, ", ") + ")"
}

func isVar(s string) bool {
	r, _ := utf8.DecodeRuneInString(s)
	return unicode.IsUpper(r)
}

type env map[string]string

// match tente d'unifier le motif p avec le fait f sous l'environnement e. Renvoie l'environnement étendu.
func match(p, f Atom, e env) (env, bool) {
	if p.Pred != f.Pred || len(p.Args) != len(f.Args) {
		return nil, false
	}
	out := make(env, len(e)+len(p.Args))
	for k, v := range e {
		out[k] = v
	}
	for i, arg := range p.Args {
		if !isVar(arg) {
			if arg != f.Args[i] {
				return nil, false
			}
			continue
		}
		if bound, ok := out[arg]; ok {
			if bound != f.Args[i] {
				return nil, false
			}
		} else {
			out[arg] = f.Args[i]
		}
	}
	return out, true
}

// solve renvoie tous les environnements qui satisfont body à partir de e, face aux faits de db.
func solve(body []Atom, db map[string][]Atom, e env) []env {
	if len(body) == 0 {
		return []env{e}
	}
	var out []env
	for _, fact := range db[body[0].Pred] {
		if next, ok := match(body[0], fact, e); ok {
			out = append(out, solve(body[1:], db, next)...)
		}
	}
	return out
}

// safe indique que toutes les variables de la tête apparaissent dans le corps.
func safe(r Rule) bool {
	inBody := map[string]bool{}
	for _, a := range r.Body {
		for _, arg := range a.Args {
			if isVar(arg) {
				inBody[arg] = true
			}
		}
	}
	for _, arg := range r.Head.Args {
		if isVar(arg) && !inBody[arg] {
			return false
		}
	}
	return true
}

func instantiate(head Atom, e env) Atom {
	args := make([]string, len(head.Args))
	for i, a := range head.Args {
		if isVar(a) {
			args[i] = e[a]
		} else {
			args[i] = a
		}
	}
	return Atom{Pred: head.Pred, Args: args}
}

// Eval applique les règles aux faits jusqu'au point fixe et renvoie tous les faits (de départ et dérivés),
// sans doublon, triés par leur forme String(). Les règles non sûres (une variable de la tête absente du corps)
// sont ignorées. Les faits d'entrée sont des atomes sans variable.
func Eval(facts []Atom, rules []Rule) []Atom {
	known := map[string]Atom{}
	byPred := map[string][]Atom{}
	add := func(a Atom) bool {
		key := a.String()
		if _, ok := known[key]; ok {
			return false
		}
		known[key] = a
		byPred[a.Pred] = append(byPred[a.Pred], a)
		return true
	}
	for _, f := range facts {
		add(f)
	}
	for changed := true; changed; {
		changed = false
		for _, r := range rules {
			if !safe(r) {
				continue
			}
			for _, e := range solve(r.Body, byPred, env{}) {
				if add(instantiate(r.Head, e)) {
					changed = true
				}
			}
		}
	}
	out := make([]Atom, 0, len(known))
	for _, a := range known {
		out = append(out, a)
	}
	slices.SortFunc(out, func(a, b Atom) int { return strings.Compare(a.String(), b.String()) })
	return out
}

// Query renvoie, pour chaque fait de db qui correspond au motif, l'association variable → valeur.
// Les résultats sont sans doublon, dans l'ordre des faits triés par String(). Un motif sans variable qui
// correspond donne une unique association vide ; sans correspondance, une slice vide.
func Query(db []Atom, pattern Atom) []map[string]string {
	sorted := slices.Clone(db)
	slices.SortFunc(sorted, func(a, b Atom) int { return strings.Compare(a.String(), b.String()) })
	seen := map[string]bool{}
	out := []map[string]string{}
	for _, f := range sorted {
		e, ok := match(pattern, f, env{})
		if !ok {
			continue
		}
		key := Atom{Pred: "b", Args: flatten(e)}.String()
		if seen[key] {
			continue
		}
		seen[key] = true
		out = append(out, map[string]string(e))
	}
	return out
}

func flatten(e env) []string {
	keys := make([]string, 0, len(e))
	for k := range e {
		keys = append(keys, k)
	}
	slices.Sort(keys)
	var out []string
	for _, k := range keys {
		out = append(out, k, e[k])
	}
	return out
}
