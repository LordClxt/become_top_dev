package lab

import (
	"errors"
	"fmt"
	"math"
	"strconv"
	"unicode"
)

var (
	ErrSyntax         = errors.New("syntaxe invalide")
	ErrUnknownName    = errors.New("nom inconnu")
	ErrDivisionByZero = errors.New("division par zéro")
	ErrDomain         = errors.New("hors du domaine")
	ErrArity          = errors.New("mauvais nombre d'arguments")
)

// function décrit une fonction mathématique : son nombre d'arguments (max < 0 = illimité) et son calcul.
type function struct {
	min, max int
	call     func(args []float64) (float64, error)
}

var functions = map[string]function{
	"abs": {1, 1, func(a []float64) (float64, error) { return math.Abs(a[0]), nil }},
	"sqrt": {1, 1, func(a []float64) (float64, error) {
		if a[0] < 0 {
			return 0, fmt.Errorf("%w : sqrt(%v)", ErrDomain, a[0])
		}
		return math.Sqrt(a[0]), nil
	}},
	"pow": {2, 2, func(a []float64) (float64, error) { return power(a[0], a[1]) }},
	"max": {1, -1, func(a []float64) (float64, error) { return fold(a, math.Max), nil }},
	"min": {1, -1, func(a []float64) (float64, error) { return fold(a, math.Min), nil }},
	"sum": {0, -1, func(a []float64) (float64, error) { return fold(a, add), nil }},
	"avg": {1, -1, func(a []float64) (float64, error) { return fold(a, add) / float64(len(a)), nil }},
}

func add(a, b float64) float64 { return a + b }

func fold(values []float64, f func(a, b float64) float64) float64 {
	if len(values) == 0 {
		return 0
	}
	acc := values[0]
	for _, v := range values[1:] {
		acc = f(acc, v)
	}
	return acc
}

func power(base, exponent float64) (float64, error) {
	result := math.Pow(base, exponent)
	if math.IsNaN(result) || math.IsInf(result, 0) {
		return 0, fmt.Errorf("%w : %v ^ %v", ErrDomain, base, exponent)
	}
	return result, nil
}

type token struct {
	kind   byte // 'n' nombre, 'i' identifiant, sinon le caractère de l'opérateur ; 0 en fin d'entrée
	text   string
	number float64
}

func tokenize(src string) ([]token, error) {
	var tokens []token
	runes := []rune(src)
	for i := 0; i < len(runes); {
		r := runes[i]
		switch {
		case unicode.IsSpace(r):
			i++
		case r >= '0' && r <= '9':
			start := i
			for i < len(runes) && runes[i] >= '0' && runes[i] <= '9' {
				i++
			}
			if i < len(runes) && runes[i] == '.' {
				i++
				digits := i
				for i < len(runes) && runes[i] >= '0' && runes[i] <= '9' {
					i++
				}
				if i == digits {
					return nil, fmt.Errorf("%w : nombre incomplet %q", ErrSyntax, string(runes[start:i]))
				}
			}
			text := string(runes[start:i])
			value, err := strconv.ParseFloat(text, 64)
			if err != nil {
				return nil, fmt.Errorf("%w : nombre %q", ErrSyntax, text)
			}
			tokens = append(tokens, token{kind: 'n', text: text, number: value})
		case unicode.IsLetter(r) || r == '_':
			start := i
			for i < len(runes) && (unicode.IsLetter(runes[i]) || unicode.IsDigit(runes[i]) || runes[i] == '_') {
				i++
			}
			tokens = append(tokens, token{kind: 'i', text: string(runes[start:i])})
		case r == '+' || r == '-' || r == '*' || r == '/' || r == '^' || r == '(' || r == ')' || r == ',':
			tokens = append(tokens, token{kind: byte(r), text: string(r)})
			i++
		default:
			return nil, fmt.Errorf("%w : caractère %q inattendu", ErrSyntax, r)
		}
	}
	return tokens, nil
}

// Eval calcule une expression arithmétique.
//
//	expression := terme (('+' | '-') terme)*
//	terme      := unaire (('*' | '/') unaire)*
//	unaire     := '-' unaire | puissance
//	puissance  := primaire ('^' unaire)?            (associatif à droite)
//	primaire   := nombre | nom | nom '(' [expression (',' expression)*] ')' | '(' expression ')'
func Eval(expression string, vars map[string]float64) (float64, error) {
	tokens, err := tokenize(expression)
	if err != nil {
		return 0, err
	}

	pos := 0
	peek := func() token {
		if pos < len(tokens) {
			return tokens[pos]
		}
		return token{}
	}
	next := func() token {
		t := peek()
		pos++
		return t
	}

	var parseExpression, parseTerm, parseUnary, parsePower, parsePrimary func() (float64, error)

	parseExpression = func() (float64, error) {
		left, err := parseTerm()
		if err != nil {
			return 0, err
		}
		for peek().kind == '+' || peek().kind == '-' {
			op := next().kind
			var right float64
			if right, err = parseTerm(); err != nil {
				return 0, err
			}
			if op == '+' {
				left += right
			} else {
				left -= right
			}
		}
		return left, nil
	}

	parseTerm = func() (float64, error) {
		left, err := parseUnary()
		if err != nil {
			return 0, err
		}
		for peek().kind == '*' || peek().kind == '/' {
			op := next().kind
			var right float64
			if right, err = parseUnary(); err != nil {
				return 0, err
			}
			switch {
			case op == '*':
				left *= right
			case right == 0:
				return 0, ErrDivisionByZero
			default:
				left /= right
			}
		}
		return left, nil
	}

	parseUnary = func() (float64, error) {
		if peek().kind == '-' {
			next()
			value, err := parseUnary()
			return -value, err
		}
		return parsePower()
	}

	parsePower = func() (float64, error) {
		base, err := parsePrimary()
		if err != nil || peek().kind != '^' {
			return base, err
		}
		next()
		exponent, err := parseUnary() // l'exposant peut être négatif, et ^ s'associe à droite
		if err != nil {
			return 0, err
		}
		return power(base, exponent)
	}

	parsePrimary = func() (float64, error) {
		t := next()
		switch t.kind {
		case 'n':
			return t.number, nil

		case '(':
			value, err := parseExpression()
			if err != nil {
				return 0, err
			}
			if next().kind != ')' {
				return 0, fmt.Errorf("%w : parenthèse fermante attendue", ErrSyntax)
			}
			return value, nil

		case 'i':
			if peek().kind != '(' {
				value, ok := vars[t.text]
				if !ok {
					return 0, fmt.Errorf("%w : %q", ErrUnknownName, t.text)
				}
				return value, nil
			}
			next() // '('
			var args []float64
			if peek().kind == ')' {
				next()
			} else {
				for {
					arg, err := parseExpression()
					if err != nil {
						return 0, err
					}
					args = append(args, arg)
					if sep := next(); sep.kind == ')' {
						break
					} else if sep.kind != ',' {
						return 0, fmt.Errorf("%w : « , » ou « ) » attendu dans l'appel à %s", ErrSyntax, t.text)
					}
				}
			}
			fn, ok := functions[t.text]
			if !ok {
				return 0, fmt.Errorf("%w : fonction %q", ErrUnknownName, t.text)
			}
			if len(args) < fn.min || (fn.max >= 0 && len(args) > fn.max) {
				return 0, fmt.Errorf("%w : %s reçoit %d argument(s)", ErrArity, t.text, len(args))
			}
			return fn.call(args)
		}
		return 0, fmt.Errorf("%w : élément inattendu %q", ErrSyntax, t.text)
	}

	value, err := parseExpression()
	if err != nil {
		return 0, err
	}
	if pos < len(tokens) {
		return 0, fmt.Errorf("%w : %q inattendu après l'expression", ErrSyntax, tokens[pos].text)
	}
	return value, nil
}
