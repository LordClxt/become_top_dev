// Ce fichier reprend la solution du TP « Le lexer insère-t-il un point-virgule ? ».
// Il est fourni : tu peux l'utiliser tel quel depuis review.go.

package lab

import "strings"

// Les mots-clés de Go. Ce ne sont pas des identifiants : seuls quatre
// d'entre eux déclenchent l'insertion d'un point-virgule.
var keywords = map[string]bool{
	"break": true, "case": true, "chan": true, "const": true, "continue": true,
	"default": true, "defer": true, "else": true, "fallthrough": true, "for": true,
	"func": true, "go": true, "goto": true, "if": true, "import": true,
	"interface": true, "map": true, "package": true, "range": true, "return": true,
	"select": true, "struct": true, "switch": true, "type": true, "var": true,
}

var terminatingKeywords = map[string]bool{"break": true, "continue": true, "fallthrough": true, "return": true}

// needsSemicolon indique si le lexer de Go insère un point-virgule à la fin
// de cette ligne de code.
func needsSemicolon(line string) bool {
	code := strings.TrimRight(stripComment(line), " \t")
	if code == "" {
		return false
	}
	switch {
	case strings.HasSuffix(code, "++"), strings.HasSuffix(code, "--"):
		return true
	}
	last := code[len(code)-1]
	switch last {
	case ')', ']', '}', '"', '`', '\'':
		return true
	}
	if !isWordChar(last) {
		return false
	}
	start := len(code)
	for start > 0 && isWordChar(code[start-1]) {
		start--
	}
	word := code[start:]
	if keywords[word] {
		return terminatingKeywords[word]
	}
	return true // identifiant ou nombre
}

// stripComment retire un commentaire // de fin de ligne, sans toucher
// aux // qui se trouvent dans un littéral de string ou de rune.
func stripComment(line string) string {
	var quote byte
	for i := 0; i < len(line); i++ {
		c := line[i]
		switch {
		case quote != 0:
			if c == '\\' && quote != '`' {
				i++
			} else if c == quote {
				quote = 0
			}
		case c == '"' || c == '`' || c == '\'':
			quote = c
		case c == '/' && i+1 < len(line) && line[i+1] == '/':
			return line[:i]
		}
	}
	return line
}

func isWordChar(c byte) bool {
	return c == '_' || c >= '0' && c <= '9' || c >= 'a' && c <= 'z' || c >= 'A' && c <= 'Z' || c >= 0x80
}
