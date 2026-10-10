// Package lab relit un module Go comme le ferait une CI : go.mod, syntaxe, vet.
package lab

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
	// TODO: trois vérifications (go.mod, syntaxe, vet), puis un tri.
	// needsSemicolon et stripComment (lexer.go) sont à ta disposition.
	return nil
}
