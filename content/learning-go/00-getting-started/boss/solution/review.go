// Package lab relit un module Go comme le ferait une CI : go.mod, syntaxe, vet.
package lab

import (
	"cmp"
	"fmt"
	"slices"
	"strconv"
	"strings"
)

// Finding est un problème trouvé par Review.
type Finding struct {
	File  string // "go.mod" ou "main.go"
	Line  int    // à partir de 1 ; 0 = le fichier entier
	Check string // "gomod", "syntax" ou "vet"
	Msg   string
}

// Review renvoie les problèmes de gomod et de src, triés par fichier puis par ligne.
// toolchain est la version de Go installée sur la CI, par exemple "1.22".
func Review(gomod, src, toolchain string) []Finding {
	out := checkGoMod(gomod, toolchain)
	out = append(out, checkSyntax(src)...)
	out = append(out, checkVet(src)...)
	slices.SortStableFunc(out, func(a, b Finding) int {
		return cmp.Or(cmp.Compare(a.File, b.File), cmp.Compare(a.Line, b.Line))
	})
	return out
}

// --- go.mod ---------------------------------------------------------------------

func checkGoMod(gomod, toolchain string) []Finding {
	var out []Finding
	hasModule := false
	for i, line := range strings.Split(gomod, "\n") {
		code, _, _ := strings.Cut(line, "//")
		fields := strings.Fields(code)
		if len(fields) != 2 {
			continue
		}
		switch fields[0] {
		case "module":
			hasModule = true
		case "go":
			if compareVersions(fields[1], toolchain) > 0 {
				msg := fmt.Sprintf("go.mod exige go %s, la CI n'a que go %s", fields[1], toolchain)
				out = append(out, Finding{"go.mod", i + 1, "gomod", msg})
			}
		}
	}
	if !hasModule {
		out = append(out, Finding{"go.mod", 0, "gomod", "directive module absente"})
	}
	return out
}

// compareVersions compare "1.9" et "1.10" nombre par nombre, pas comme des strings.
func compareVersions(a, b string) int {
	pa, pb := strings.Split(a, "."), strings.Split(b, ".")
	for i := range max(len(pa), len(pb)) {
		if c := cmp.Compare(versionPart(pa, i), versionPart(pb, i)); c != 0 {
			return c
		}
	}
	return 0
}

func versionPart(parts []string, i int) int {
	if i >= len(parts) {
		return 0
	}
	n, _ := strconv.Atoi(parts[i])
	return n
}

// --- syntaxe : la règle des points-virgules ------------------------------------------

// Débuts de ligne qui prolongent forcément l'instruction précédente.
var continuations = []string{"&&", "||", "==", "!=", "{", ".", "+", "-", "/", "%", ",", "else"}

func checkSyntax(src string) []Finding {
	var out []Finding
	lines := strings.Split(src, "\n")
	prev := -1 // index de la dernière ligne de code
	for i, line := range lines {
		code := strings.TrimSpace(stripComment(line))
		if code == "" {
			continue
		}
		if prev >= 0 && needsSemicolon(lines[prev]) {
			if tok := continuation(code); tok != "" {
				msg := fmt.Sprintf("un ; est inséré à la fin de la ligne %d, et cette ligne commence par %q", prev+1, tok)
				out = append(out, Finding{"main.go", i + 1, "syntax", msg})
			}
		}
		prev = i
	}
	return out
}

func continuation(code string) string {
	for _, tok := range continuations {
		if strings.HasPrefix(code, tok) && (tok != "else" || len(code) == 4 || !isWordChar(code[4])) {
			return tok
		}
	}
	return ""
}

// --- vet : les appels à fmt -------------------------------------------------------------

// Position de la chaîne de format dans les arguments ; -1 = fonction sans format.
var fmtFuncs = map[string]int{
	"Printf": 0, "Sprintf": 0, "Errorf": 0, "Fprintf": 1,
	"Print": -1, "Println": -1, "Sprint": -1, "Sprintln": -1, "Fprint": -1, "Fprintln": -1,
}

func checkVet(src string) []Finding {
	var out []Finding
	for i, line := range strings.Split(src, "\n") {
		code := stripComment(line)
		for at := 0; ; {
			j := strings.Index(code[at:], "fmt.")
			if j < 0 {
				break
			}
			start := at + j + len("fmt.")
			at = start
			name := code[start:]
			name = name[:strings.IndexFunc(name+"(", func(r rune) bool { return !isWordChar(byte(r)) })]
			pos, known := fmtFuncs[name]
			rest := code[start+len(name):]
			if !known || !strings.HasPrefix(rest, "(") {
				continue
			}
			args, ok := splitArgs(rest[1:])
			if !ok {
				continue // appel sur plusieurs lignes : hors sujet
			}
			if msg := vetCall(name, pos, args); msg != "" {
				out = append(out, Finding{"main.go", i + 1, "vet", msg})
			}
		}
	}
	return out
}

func vetCall(name string, pos int, args []string) string {
	if pos < 0 {
		for _, a := range args {
			if s, err := strconv.Unquote(a); err == nil && len(countFormat(s).verbs) > 0 {
				return fmt.Sprintf("fmt.%s ne comprend pas les verbes : utilise fmt.%sf", name, strings.TrimSuffix(name, "ln"))
			}
		}
		return ""
	}
	if pos >= len(args) {
		return ""
	}
	format, err := strconv.Unquote(args[pos])
	if err != nil {
		return "" // format non constant : vet ne peut rien dire
	}
	f := countFormat(format)
	nargs := len(args) - pos - 1
	switch {
	case f.trailing:
		return fmt.Sprintf("fmt.%s : %% seul en fin de format", name)
	case len(f.unknown) > 0:
		return fmt.Sprintf("fmt.%s : verbe inconnu %s", name, f.unknown[0])
	case f.used != nargs:
		return fmt.Sprintf("fmt.%s : le format lit %d valeur(s), l'appel en fournit %d", name, f.used, nargs)
	}
	return ""
}

// splitArgs découpe les arguments d'un appel jusqu'à la parenthèse fermante,
// en respectant les parenthèses imbriquées et les littéraux. ok = false si l'appel
// ne se ferme pas sur la ligne.
func splitArgs(s string) (args []string, ok bool) {
	depth, start := 0, 0
	var quote byte
	for i := 0; i < len(s); i++ {
		c := s[i]
		switch {
		case quote != 0:
			if c == '\\' && quote != '`' {
				i++
			} else if c == quote {
				quote = 0
			}
		case c == '"' || c == '`' || c == '\'':
			quote = c
		case c == '(' || c == '[' || c == '{':
			depth++
		case c == ')' && depth == 0:
			if last := strings.TrimSpace(s[start:i]); last != "" {
				args = append(args, last)
			}
			return args, true
		case c == ')' || c == ']' || c == '}':
			depth--
		case c == ',' && depth == 0:
			args = append(args, strings.TrimSpace(s[start:i]))
			start = i + 1
		}
	}
	return nil, false
}

type formatInfo struct {
	verbs, unknown []string
	used           int
	trailing       bool
}

const (
	fmtFlags = "+-# 0"
	fmtVerbs = "vTtbcdoOqxXUeEfFgGsp"
)

// countFormat lit un format comme fmt : chaque verbe et chaque * consomment une valeur.
func countFormat(format string) formatInfo {
	var f formatInfo
	for i := 0; i < len(format); i++ {
		if format[i] != '%' {
			continue
		}
		start := i
		i++
		if i < len(format) && format[i] == '%' {
			continue
		}
		for i < len(format) && strings.IndexByte(fmtFlags, format[i]) >= 0 {
			i++
		}
		i = f.skipNumber(format, i)
		if i < len(format) && format[i] == '.' {
			i = f.skipNumber(format, i+1)
		}
		if i >= len(format) {
			f.trailing = true
			break
		}
		if strings.IndexByte(fmtVerbs, format[i]) < 0 {
			f.unknown = append(f.unknown, format[start:i+1])
		} else {
			f.verbs = append(f.verbs, format[start:i+1])
		}
		f.used++
	}
	return f
}

func (f *formatInfo) skipNumber(format string, i int) int {
	if i < len(format) && format[i] == '*' {
		f.used++
		return i + 1
	}
	for i < len(format) && format[i] >= '0' && format[i] <= '9' {
		i++
	}
	return i
}
