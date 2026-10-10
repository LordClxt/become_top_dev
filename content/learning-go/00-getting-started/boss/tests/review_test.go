package lab

import (
	"fmt"
	"slices"
	"strings"
	"testing"
)

const goodMod = "module example.com/relay\n\ngo 1.22 // version minimale\n"

// Chaque problème attendu est signalé en commentaire de test, pas dans le source.
var mainGo = strings.Join([]string{
	`package main`, // 1
	``,
	`import "fmt"`,
	``,
	`func main()`, // 5
	`{`,           // 6  syntax : accolade à la ligne
	`	name := "Ada"`,
	`	total := 3 +`, // 8  pas de ; après un opérateur
	`		4`,
	`	fmt.Printf("%s a %d messages\n", name)`,     // 10 vet : 2 verbes, 1 valeur
	`	fmt.Println("total : %d", total)`,           // 11 vet : Println avec un verbe
	`	msg := fmt.Sprintf("%d%% fait", 75)`,        // 12 ok : %% est littéral
	`	fmt.Fprintf(os.Stderr, "%-*s|\n", 10, msg)`, // 13 ok : * lit une valeur
	`	if total > 5 {`,
	`		fmt.Println(msg, "http://relay.dev") // fmt.Printf("%d")`, // 15 ok : // dans une string, puis commentaire
	`	}`,
	`	else {`, // 17 syntax : else à la ligne
	`		fmt.Println(fmt.Sprintf("%s:%d", name))`, // 18 vet : Sprintf imbriqué
	`	}`,
	`	result := compute(total)`,
	`		.String()`,                // 21 syntax : chaîne d'appels coupée avant le point
	`	fmt.Printf("%.2f%", 3.14)`, // 22 vet : % seul en fin de format
	`	fmt.Printf("%z\n", 1)`,     // 23 vet : verbe inconnu
	`	fmt.Printf("%v et %v\n", f(a, b), []int{1, 2})`, // 24 ok : virgules imbriquées
	`}`,
}, "\n")

type key struct {
	File, Check string
	Line        int
}

func keys(fs []Finding) []key {
	out := make([]key, 0, len(fs))
	for _, f := range fs {
		out = append(out, key{f.File, f.Check, f.Line})
	}
	return out
}

func only(fs []Finding, check string) []int {
	var lines []int
	for _, f := range fs {
		if f.Check == check {
			lines = append(lines, f.Line)
		}
	}
	return lines
}

func TestGoModVersion(t *testing.T) {
	cases := []struct {
		mod, toolchain string
		want           []int
	}{
		{goodMod, "1.22", nil},
		{goodMod, "1.23.1", nil},
		{goodMod, "1.21.5", []int{3}},
		{"module m\ngo 1.10\n", "1.9", []int{2}},
		{"module m\ngo 1.9\n", "1.10", nil},
		{"module m\n// go 1.99\ngo 1.22.0\n", "1.22", nil},
	}
	for _, c := range cases {
		got := only(Review(c.mod, "", c.toolchain), "gomod")
		if !slices.Equal(got, c.want) {
			t.Errorf("go.mod %q avec la CI en go %s : lignes signalées %v, attendu %v — 1.10 est plus récent que 1.9",
				c.mod, c.toolchain, got, c.want)
		}
	}
}

func TestGoModMissingModule(t *testing.T) {
	got := Review("go 1.22\n", "", "1.22")
	if len(got) != 1 || got[0].File != "go.mod" || got[0].Check != "gomod" || got[0].Line != 0 {
		t.Errorf("sans directive module : %+v, attendu un seul Finding{File: go.mod, Line: 0, Check: gomod}", got)
	}
}

func TestSyntax(t *testing.T) {
	got := only(Review(goodMod, mainGo, "1.22"), "syntax")
	if want := []int{6, 17, 21}; !slices.Equal(got, want) {
		t.Errorf("problèmes de syntaxe aux lignes %v, attendu %v (accolade à la ligne, else à la ligne, appel coupé avant le point)", got, want)
	}
}

func TestSyntaxNoFalsePositive(t *testing.T) {
	src := "x := a +\n\tb\nif ok &&\n\tready {\n}\ny := f(\n\t1,\n\t2,\n)\n// .commentaire\n*p = 3\n"
	if got := only(Review(goodMod, src, "1.22"), "syntax"); len(got) != 0 {
		t.Errorf("aucun problème de syntaxe attendu dans %q, signalé aux lignes %v", src, got)
	}
}

func TestVet(t *testing.T) {
	got := only(Review(goodMod, mainGo, "1.22"), "vet")
	if want := []int{10, 11, 18, 22, 23}; !slices.Equal(got, want) {
		t.Errorf("problèmes vet aux lignes %v, attendu %v", got, want)
	}
}

func TestVetMessages(t *testing.T) {
	for _, f := range Review(goodMod, mainGo, "1.22") {
		if strings.TrimSpace(f.Msg) == "" {
			t.Errorf("Finding %+v sans message : explique le problème à l'auteur du code", f)
		}
	}
}

func TestReviewOrder(t *testing.T) {
	got := keys(Review("module m\ngo 1.30\n", mainGo, "1.22"))
	want := []key{{"go.mod", "gomod", 2}}
	for _, l := range []int{6, 10, 11, 17, 18, 21, 22, 23} {
		check := "vet"
		if l == 6 || l == 17 || l == 21 {
			check = "syntax"
		}
		want = append(want, key{"main.go", check, l})
	}
	if !slices.Equal(got, want) {
		t.Errorf("Review doit trier par fichier puis par ligne.\nobtenu : %v\nattendu : %v", fmt.Sprint(got), fmt.Sprint(want))
	}
}
