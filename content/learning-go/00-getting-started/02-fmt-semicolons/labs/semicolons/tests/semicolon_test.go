package lab

import "testing"

func TestNeedsSemicolon(t *testing.T) {
	cases := []struct {
		line string
		want bool
		why  string
	}{
		{`func main() {`, false, "la ligne finit par {, qui n'est pas dans la liste"},
		{`func main()`, true, "la ligne finit par ) : c'est le piège de l'accolade à la ligne"},
		{`x := 42`, true, "un littéral numérique termine l'instruction"},
		{`name := "Ada"`, true, "un littéral de string termine l'instruction"},
		{"query := `SELECT 1`", true, "une raw string est aussi un littéral"},
		{`r := 'a'`, true, "un littéral de rune termine l'instruction"},
		{`var total int`, true, "int est un identifiant, pas un mot-clé"},
		{`count++`, true, "++ est dans la liste"},
		{`n--`, true, "-- est dans la liste"},
		{`return`, true, "return fait partie des quatre mots-clés qui terminent"},
		{`		break`, true, "break termine, même indenté"},
		{`} else {`, false, "la ligne finit par {"},
		{`if ok && valid {`, false, "la ligne finit par {"},
		{`total := a +`, false, "un opérateur en fin de ligne : l'expression continue"},
		{`fmt.Println(a,`, false, "une virgule : l'appel continue à la ligne suivante"},
		{`items[3]`, true, "] est dans la liste"},
		{`}`, true, "} est dans la liste"},
		{`8443`, true, "dans une liste sur plusieurs lignes, il faut une virgule finale"},
		{`} else`, false, "else est un mot-clé qui ne termine pas"},
		{`x := y // compteur`, true, "le commentaire est ignoré : le dernier token est y"},
		{`f(a, // premier argument`, false, "le commentaire est ignoré : le dernier token est la virgule"},
		{`url := "http://relay.dev"`, true, "les // dans une string ne sont pas un commentaire"},
		{``, false, "une ligne vide n'ajoute rien"},
		{`   // juste un commentaire`, false, "une ligne de commentaire n'ajoute rien"},
		{`total := 0   `, true, "les espaces de fin ne comptent pas"},
	}
	for _, c := range cases {
		if got := NeedsSemicolon(c.line); got != c.want {
			t.Errorf("NeedsSemicolon(%q) = %v, attendu %v — %s", c.line, got, c.want, c.why)
		}
	}
}
