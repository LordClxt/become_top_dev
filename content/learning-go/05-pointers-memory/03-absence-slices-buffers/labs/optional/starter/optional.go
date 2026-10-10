package lab

import (
	"errors"
	"io"
)

// Settings est une configuration dont chaque champ est facultatif : nil signifie « non renseigné ».
// Un pointeur vers 0, false ou "" est bien une valeur renseignée.
type Settings struct {
	Port  *int
	Debug *bool
	Name  *string
}

// Merge renvoie base dont les champs renseignés dans override sont remplacés.
// Le résultat ne partage aucun pointeur avec base ni override : modifier une valeur pointée par le résultat
// ne doit modifier aucune des deux entrées.
func Merge(base, override Settings) Settings {
	// TODO
	panic("à implémenter")
}

// Describe affiche la configuration : « port=8080 debug=unset name=api ».
// Un champ non renseigné s'affiche « unset ».
func Describe(s Settings) string {
	// TODO
	panic("à implémenter")
}

// ParseOptionalInt lit un entier facultatif : une chaîne vide (ou d'espaces) donne (nil, nil) ;
// un entier valide donne un pointeur vers sa valeur ; sinon (nil, erreur).
func ParseOptionalInt(s string) (*int, error) {
	// TODO
	panic("à implémenter")
}

// ErrEmptyBuffer est renvoyée par ReadChunks quand le tampon fourni est vide.
var ErrEmptyBuffer = errors.New("tampon vide")

// ReadChunks lit r par morceaux dans buf et appelle handle pour chacun (une vue sur buf, valable
// seulement pendant l'appel). Elle s'arrête sans erreur à la fin des données (io.EOF), et renvoie
// la première erreur de lecture ou de handle. Elle n'alloue rien dans sa boucle.
func ReadChunks(r io.Reader, buf []byte, handle func(chunk []byte) error) error {
	// TODO
	panic("à implémenter")
}
