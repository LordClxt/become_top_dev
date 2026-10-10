package lab

import (
	"fmt"
	"strconv"
	"strings"
	"unicode"
)

// Run exécute un programme jouet qui reprend les règles de portée de Go et renvoie les lignes affichées par « print ».
//
// Instructions, une par ligne (les lignes vides et celles qui commencent par // sont ignorées) :
//
//	var NAME = INT    déclare NAME dans le bloc courant
//	NAME := INT       idem
//	NAME = INT        modifie la variable NAME la plus proche
//	print NAME        affiche la valeur de la variable NAME la plus proche
//	{                 ouvre un bloc
//	}                 ferme le bloc courant
func Run(program string) ([]string, error) {
	scopes := []map[string]int{{}}
	openLines := []int{} // numéros des lignes des « { » encore ouverts
	var out []string

	fail := func(line int, format string, args ...any) ([]string, error) {
		return out, fmt.Errorf("ligne %d : %s", line, fmt.Sprintf(format, args...))
	}
	lookup := func(name string) (map[string]int, bool) {
		for i := len(scopes) - 1; i >= 0; i-- {
			if _, ok := scopes[i][name]; ok {
				return scopes[i], true
			}
		}
		return nil, false
	}

	for i, raw := range strings.Split(program, "\n") {
		lineNo := i + 1
		line := strings.TrimSpace(raw)
		if line == "" || strings.HasPrefix(line, "//") {
			continue
		}
		fields := strings.Fields(line)

		switch {
		case line == "{":
			scopes = append(scopes, map[string]int{})
			openLines = append(openLines, lineNo)

		case line == "}":
			if len(scopes) == 1 {
				return fail(lineNo, "unexpected }")
			}
			scopes = scopes[:len(scopes)-1]
			openLines = openLines[:len(openLines)-1]

		case len(fields) == 4 && fields[0] == "var" && fields[2] == "=":
			if err := declare(scopes[len(scopes)-1], fields[1], fields[3]); err != nil {
				return fail(lineNo, "%s", err)
			}

		case len(fields) == 3 && fields[1] == ":=":
			if err := declare(scopes[len(scopes)-1], fields[0], fields[2]); err != nil {
				return fail(lineNo, "%s", err)
			}

		case len(fields) == 3 && fields[1] == "=" && validName(fields[0]):
			value, err := strconv.Atoi(fields[2])
			if err != nil {
				return fail(lineNo, "syntax error")
			}
			scope, ok := lookup(fields[0])
			if !ok {
				return fail(lineNo, "undefined: %s", fields[0])
			}
			scope[fields[0]] = value

		case len(fields) == 2 && fields[0] == "print" && validName(fields[1]):
			scope, ok := lookup(fields[1])
			if !ok {
				return fail(lineNo, "undefined: %s", fields[1])
			}
			out = append(out, strconv.Itoa(scope[fields[1]]))

		default:
			return fail(lineNo, "syntax error")
		}
	}

	if len(openLines) > 0 {
		return fail(openLines[len(openLines)-1], "missing }")
	}
	return out, nil
}

func declare(scope map[string]int, name, text string) error {
	if !validName(name) {
		return fmt.Errorf("syntax error")
	}
	value, err := strconv.Atoi(text)
	if err != nil {
		return fmt.Errorf("syntax error")
	}
	if _, exists := scope[name]; exists {
		return fmt.Errorf("%s redeclared in this block", name)
	}
	scope[name] = value
	return nil
}

func validName(name string) bool {
	if name == "" || name == "var" || name == "print" {
		return false
	}
	for i, r := range name {
		if r != '_' && !unicode.IsLetter(r) && (i == 0 || !unicode.IsDigit(r)) {
			return false
		}
	}
	return true
}
