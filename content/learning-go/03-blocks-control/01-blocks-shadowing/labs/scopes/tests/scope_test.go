package lab

import (
	"slices"
	"strings"
	"testing"
)

func TestRunOutputs(t *testing.T) {
	cases := []struct {
		name    string
		program string
		want    []string
	}{
		{"shadowing du livre", `
var x = 10
{
	print x
	x := 5
	print x
}
print x`, []string{"10", "5", "10"}},

		{"affectation au lieu de déclaration", `
var x = 10
{
	x = 5
	print x
}
print x`, []string{"5", "5"}},

		{"trois niveaux", `
var a = 1
{
	var a = 2
	{
		a = 3
		print a
	}
	print a
}
print a`, []string{"3", "3", "1"}},

		{"masquage au milieu d'un bloc", `
var n = 1
{
	print n
	var n = 2
	print n
	n = 3
	print n
}
print n`, []string{"1", "2", "3", "1"}},

		{"même nom dans deux blocs frères", `
{
	var t = 1
	print t
}
{
	var t = 2
	print t
}`, []string{"1", "2"}},

		{"redéclarer dans un bloc interne est permis", `
var x = 1
{
	var x = 2
	print x
}`, []string{"2"}},

		{"commentaires et lignes vides", `
// début

var x = 7   
   print x
// fin`, []string{"7"}},

		{"nombres négatifs", `
var x = -4
x = -9
print x`, []string{"-9"}},

		{"aucune sortie", `var x = 1`, nil},
	}
	for _, c := range cases {
		got, err := Run(c.program)
		if err != nil || !slices.Equal(got, c.want) {
			t.Errorf("%s : Run() = (%v, %v), attendu %v", c.name, got, err, c.want)
		}
	}
}

func TestRunErrors(t *testing.T) {
	cases := []struct {
		name    string
		program string
		want    string
	}{
		{"variable d'un bloc fermé", "var x = 1\n{\n\tvar y = 2\n}\nprint x\nprint y", "ligne 6 : undefined: y"},
		{"variable jamais déclarée", "print z", "ligne 1 : undefined: z"},
		{"affectation sans déclaration", "z = 3", "ligne 1 : undefined: z"},
		{"redéclaration dans le même bloc", "var x = 1\nvar x = 2", "ligne 2 : x redeclared in this block"},
		{"redéclaration avec :=", "x := 1\nx := 2", "ligne 2 : x redeclared in this block"},
		{"accolade fermante en trop", "var x = 1\n}", "ligne 2 : unexpected }"},
		{"accolade ouvrante jamais fermée", "var x = 1\n{\n{\n}\nprint x", "ligne 2 : missing }"},
		{"instruction inconnue", "hello", "ligne 1 : syntax error"},
		{"print sans argument", "print", "ligne 1 : syntax error"},
		{"entier invalide", "var x = abc", "ligne 1 : syntax error"},
		{"affectation sans espaces", "var x = 1\nx=2", "ligne 2 : syntax error"},
		{"nom invalide", "var 9x = 1", "ligne 1 : syntax error"},
		{"les lignes vides comptent dans la numérotation", "\n\n// c\nprint q", "ligne 4 : undefined: q"},
	}
	for _, c := range cases {
		_, err := Run(c.program)
		if err == nil || err.Error() != c.want {
			t.Errorf("%s : erreur %v, attendu %q", c.name, err, c.want)
		}
	}
}

func TestRunKeepsOutputBeforeAnError(t *testing.T) {
	out, err := Run("var x = 1\nprint x\nprint y")
	if err == nil || !slices.Equal(out, []string{"1"}) {
		t.Errorf("Run() = (%v, %v) : les lignes affichées avant l'erreur doivent être conservées", out, err)
	}
	if err != nil && !strings.HasPrefix(err.Error(), "ligne 3") {
		t.Errorf("erreur %q, attendu un message qui commence par « ligne 3 »", err)
	}
}
