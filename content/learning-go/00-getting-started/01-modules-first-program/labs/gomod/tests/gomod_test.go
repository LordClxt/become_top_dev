package lab

import (
	"errors"
	"slices"
	"testing"
)

func TestMinimalGoMod(t *testing.T) {
	got, err := Parse("module github.com/toi/relay\n\ngo 1.23\n")
	if err != nil {
		t.Fatalf("Parse a renvoyé l'erreur %v pour un go.mod valide", err)
	}
	if got.Module != "github.com/toi/relay" || got.GoVersion != "1.23" {
		t.Errorf("obtenu Module=%q GoVersion=%q, attendu \"github.com/toi/relay\" et \"1.23\"", got.Module, got.GoVersion)
	}
	if len(got.Requires) != 0 {
		t.Errorf("aucune dépendance attendue, obtenu %v", got.Requires)
	}
}

func TestRequireSingleLineAndBlock(t *testing.T) {
	src := `module example.com/shop

go 1.22

require github.com/google/uuid v1.6.0

require (
	golang.org/x/sync v0.7.0
	golang.org/x/text v0.15.0 // indirect
)
`
	got, err := Parse(src)
	if err != nil {
		t.Fatalf("erreur inattendue : %v", err)
	}
	want := []Require{
		{"github.com/google/uuid", "v1.6.0"},
		{"golang.org/x/sync", "v0.7.0"},
		{"golang.org/x/text", "v0.15.0"},
	}
	if !slices.Equal(got.Requires, want) {
		t.Errorf("Requires = %v\nattendu    %v\n— gère la forme sur une ligne ET le bloc require ( ... ), dans l'ordre du fichier", got.Requires, want)
	}
}

func TestCommentsAndBlankLinesAreIgnored(t *testing.T) {
	src := "// Mon service\nmodule   relay   // nom court\n\n\ngo 1.23 // version minimale\n"
	got, err := Parse(src)
	if err != nil {
		t.Fatalf("erreur inattendue : %v", err)
	}
	if got.Module != "relay" || got.GoVersion != "1.23" {
		t.Errorf("obtenu Module=%q GoVersion=%q — les commentaires // et les espaces en trop ne font pas partie des valeurs", got.Module, got.GoVersion)
	}
}

func TestMissingModuleIsAnError(t *testing.T) {
	_, err := Parse("go 1.23\n")
	if !errors.Is(err, ErrNoModule) {
		t.Errorf("sans directive module, Parse doit renvoyer ErrNoModule, obtenu %v", err)
	}
}
