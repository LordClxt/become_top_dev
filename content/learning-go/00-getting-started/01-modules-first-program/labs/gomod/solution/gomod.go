package lab

import (
	"errors"
	"strings"
)

// Require est une dépendance déclarée dans go.mod.
type Require struct {
	Path    string
	Version string
}

// GoMod est le contenu utile d'un fichier go.mod.
type GoMod struct {
	Module    string
	GoVersion string
	Requires  []Require
}

// ErrNoModule signale un go.mod sans directive module.
var ErrNoModule = errors.New("go.mod : directive module manquante")

// Parse lit le contenu d'un go.mod : chemin du module, version de Go et
// dépendances, qu'elles soient sur une ligne ou dans un bloc require ( ... ).
func Parse(content string) (GoMod, error) {
	var mod GoMod
	inBlock := false
	for _, line := range strings.Split(content, "\n") {
		if i := strings.Index(line, "//"); i >= 0 {
			line = line[:i]
		}
		fields := strings.Fields(line)
		if len(fields) == 0 {
			continue
		}
		if inBlock {
			if fields[0] == ")" {
				inBlock = false
			} else if len(fields) >= 2 {
				mod.Requires = append(mod.Requires, Require{Path: fields[0], Version: fields[1]})
			}
			continue
		}
		switch fields[0] {
		case "module":
			if len(fields) >= 2 {
				mod.Module = fields[1]
			}
		case "go":
			if len(fields) >= 2 {
				mod.GoVersion = fields[1]
			}
		case "require":
			if len(fields) >= 2 && fields[1] == "(" {
				inBlock = true
			} else if len(fields) >= 3 {
				mod.Requires = append(mod.Requires, Require{Path: fields[1], Version: fields[2]})
			}
		}
	}
	if mod.Module == "" {
		return GoMod{}, ErrNoModule
	}
	return mod, nil
}
