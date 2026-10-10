package lab

import (
	"errors"
	"fmt"
	"math"
)

// ParseIntLiteral lit un littéral entier Go (sans signe) et renvoie sa valeur.
func ParseIntLiteral(s string) (int64, error) {
	if s == "" {
		return 0, errors.New("littéral vide")
	}

	base, digits := int64(10), s
	if len(s) > 1 && s[0] == '0' {
		switch s[1] {
		case 'b', 'B':
			base, digits = 2, s[2:]
		case 'o', 'O':
			base, digits = 8, s[2:]
		case 'x', 'X':
			base, digits = 16, s[2:]
		default:
			base = 8 // zéro initial sans lettre : octal historique, le 0 est un chiffre valide
		}
	}
	if digits == "" {
		return 0, fmt.Errorf("%q : aucun chiffre après le préfixe", s)
	}

	var value int64
	for i := 0; i < len(digits); i++ {
		c := digits[i]
		if c == '_' {
			if i == 0 || i == len(digits)-1 || digits[i-1] == '_' {
				return 0, fmt.Errorf("%q : un _ doit séparer deux chiffres", s)
			}
			continue
		}
		d := digitValue(c)
		if d < 0 || d >= base {
			return 0, fmt.Errorf("%q : %q n'est pas un chiffre en base %d", s, c, base)
		}
		if value > (math.MaxInt64-d)/base {
			return 0, fmt.Errorf("%q : dépasse la valeur maximale d'un int64", s)
		}
		value = value*base + d
	}
	return value, nil
}

func digitValue(c byte) int64 {
	switch {
	case c >= '0' && c <= '9':
		return int64(c - '0')
	case c >= 'a' && c <= 'f':
		return int64(c-'a') + 10
	case c >= 'A' && c <= 'F':
		return int64(c-'A') + 10
	}
	return -1
}
