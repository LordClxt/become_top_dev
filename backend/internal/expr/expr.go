// Package expr évalue de petites expressions arithmétiques sûres (métriques et contraintes des fiches interactives).
//
// La syntaxe est celle des expressions Go, restreinte : nombres, variables, + - * / %, comparaisons, && || !,
// parenthèses et quelques fonctions (pow, exp, log, log2, sqrt, abs, ceil, floor, round, min, max).
// Les booléens valent 1 (vrai) ou 0 (faux). Aucune boucle, aucune affectation, aucun accès à autre chose que les variables.
package expr

import (
	"errors"
	"fmt"
	"go/ast"
	"go/parser"
	"go/token"
	"math"
	"strconv"
)

const (
	maxLen   = 400
	maxDepth = 40
)

// Expr est une expression analysée.
type Expr struct {
	src  string
	root ast.Expr
}

// Parse analyse une expression sans l'évaluer.
func Parse(src string) (*Expr, error) {
	if len(src) == 0 || len(src) > maxLen {
		return nil, fmt.Errorf("expression vide ou trop longue (max %d caractères)", maxLen)
	}
	root, err := parser.ParseExpr(src)
	if err != nil {
		return nil, fmt.Errorf("expression %q illisible", src)
	}
	e := &Expr{src: src, root: root}
	if err := e.walk(root, 0, nil); err != nil {
		return nil, fmt.Errorf("expression %q : %w", src, err)
	}
	return e, nil
}

// Idents renvoie les variables que l'expression utilise.
func (e *Expr) Idents() []string {
	seen := map[string]bool{}
	var out []string
	_ = e.walk(e.root, 0, func(name string) {
		if !seen[name] {
			seen[name] = true
			out = append(out, name)
		}
	})
	return out
}

var funcs = map[string]int{ // nom → nombre d'arguments (-1 : au moins 2)
	"pow": 2, "exp": 1, "log": 1, "log2": 1, "sqrt": 1, "abs": 1, "ceil": 1, "floor": 1, "round": 1, "min": -1, "max": -1,
}

func (e *Expr) walk(n ast.Expr, depth int, onIdent func(string)) error {
	if depth > maxDepth {
		return errors.New("expression trop imbriquée")
	}
	switch t := n.(type) {
	case *ast.BasicLit:
		if t.Kind != token.INT && t.Kind != token.FLOAT {
			return errors.New("seuls les nombres sont permis")
		}
		return nil
	case *ast.Ident:
		if onIdent != nil {
			onIdent(t.Name)
		}
		return nil
	case *ast.ParenExpr:
		return e.walk(t.X, depth+1, onIdent)
	case *ast.UnaryExpr:
		if t.Op != token.SUB && t.Op != token.ADD && t.Op != token.NOT {
			return fmt.Errorf("opérateur %s interdit", t.Op)
		}
		return e.walk(t.X, depth+1, onIdent)
	case *ast.BinaryExpr:
		switch t.Op {
		case token.ADD, token.SUB, token.MUL, token.QUO, token.REM,
			token.LSS, token.LEQ, token.GTR, token.GEQ, token.EQL, token.NEQ, token.LAND, token.LOR:
		default:
			return fmt.Errorf("opérateur %s interdit", t.Op)
		}
		if err := e.walk(t.X, depth+1, onIdent); err != nil {
			return err
		}
		return e.walk(t.Y, depth+1, onIdent)
	case *ast.CallExpr:
		id, ok := t.Fun.(*ast.Ident)
		if !ok {
			return errors.New("appel de fonction interdit")
		}
		want, ok := funcs[id.Name]
		if !ok {
			return fmt.Errorf("fonction %s inconnue", id.Name)
		}
		if (want >= 0 && len(t.Args) != want) || (want < 0 && len(t.Args) < 2) {
			return fmt.Errorf("%s : mauvais nombre d'arguments", id.Name)
		}
		for _, a := range t.Args {
			if err := e.walk(a, depth+1, onIdent); err != nil {
				return err
			}
		}
		return nil
	}
	return errors.New("construction non permise")
}

// Eval calcule l'expression avec les variables données.
func (e *Expr) Eval(vars map[string]float64) (float64, error) {
	v, err := eval(e.root, vars)
	if err != nil {
		return 0, err
	}
	if math.IsNaN(v) || math.IsInf(v, 0) {
		return 0, errors.New("résultat indéfini (division par zéro ?)")
	}
	return v, nil
}

func b2f(b bool) float64 {
	if b {
		return 1
	}
	return 0
}

func eval(n ast.Expr, vars map[string]float64) (float64, error) {
	switch t := n.(type) {
	case *ast.BasicLit:
		return strconv.ParseFloat(t.Value, 64)
	case *ast.Ident:
		v, ok := vars[t.Name]
		if !ok {
			return 0, fmt.Errorf("variable %s inconnue", t.Name)
		}
		return v, nil
	case *ast.ParenExpr:
		return eval(t.X, vars)
	case *ast.UnaryExpr:
		x, err := eval(t.X, vars)
		if err != nil {
			return 0, err
		}
		switch t.Op {
		case token.SUB:
			return -x, nil
		case token.NOT:
			return b2f(x == 0), nil
		}
		return x, nil
	case *ast.BinaryExpr:
		x, err := eval(t.X, vars)
		if err != nil {
			return 0, err
		}
		y, err := eval(t.Y, vars)
		if err != nil {
			return 0, err
		}
		switch t.Op {
		case token.ADD:
			return x + y, nil
		case token.SUB:
			return x - y, nil
		case token.MUL:
			return x * y, nil
		case token.QUO:
			if y == 0 {
				return 0, errors.New("division par zéro")
			}
			return x / y, nil
		case token.REM:
			if y == 0 {
				return 0, errors.New("division par zéro")
			}
			return math.Mod(x, y), nil
		case token.LSS:
			return b2f(x < y), nil
		case token.LEQ:
			return b2f(x <= y), nil
		case token.GTR:
			return b2f(x > y), nil
		case token.GEQ:
			return b2f(x >= y), nil
		case token.EQL:
			return b2f(x == y), nil
		case token.NEQ:
			return b2f(x != y), nil
		case token.LAND:
			return b2f(x != 0 && y != 0), nil
		case token.LOR:
			return b2f(x != 0 || y != 0), nil
		}
	case *ast.CallExpr:
		name := t.Fun.(*ast.Ident).Name
		args := make([]float64, len(t.Args))
		for i, a := range t.Args {
			v, err := eval(a, vars)
			if err != nil {
				return 0, err
			}
			args[i] = v
		}
		switch name {
		case "pow":
			return math.Pow(args[0], args[1]), nil
		case "exp":
			return math.Exp(args[0]), nil
		case "log":
			return math.Log(args[0]), nil
		case "log2":
			return math.Log2(args[0]), nil
		case "sqrt":
			return math.Sqrt(args[0]), nil
		case "abs":
			return math.Abs(args[0]), nil
		case "ceil":
			return math.Ceil(args[0]), nil
		case "floor":
			return math.Floor(args[0]), nil
		case "round":
			return math.Round(args[0]), nil
		case "min":
			m := args[0]
			for _, a := range args[1:] {
				m = math.Min(m, a)
			}
			return m, nil
		case "max":
			m := args[0]
			for _, a := range args[1:] {
				m = math.Max(m, a)
			}
			return m, nil
		}
	}
	return 0, errors.New("expression non évaluable")
}
