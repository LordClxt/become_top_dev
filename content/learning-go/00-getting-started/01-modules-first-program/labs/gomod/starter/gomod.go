package lab

import (
	"errors"
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
	// TODO: parcours les lignes (strings.Split), retire les commentaires //,
	// découpe chaque ligne en mots (strings.Fields) et reconnais les directives.
	return GoMod{}, ErrNoModule
}
