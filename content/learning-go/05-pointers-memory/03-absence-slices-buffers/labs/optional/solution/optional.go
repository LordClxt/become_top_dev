package lab

import (
	"errors"
	"fmt"
	"io"
	"strconv"
	"strings"
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
	return Settings{
		Port:  clone(override.Port, base.Port),
		Debug: clone(override.Debug, base.Debug),
		Name:  clone(override.Name, base.Name),
	}
}

// clone renvoie une copie de preferred s'il est renseigné, sinon une copie de fallback (qui peut être nil).
func clone[T any](preferred, fallback *T) *T {
	source := fallback
	if preferred != nil {
		source = preferred
	}
	if source == nil {
		return nil
	}
	value := *source
	return &value
}

// Describe affiche la configuration : « port=8080 debug=unset name=api ».
// Un champ non renseigné s'affiche « unset ».
func Describe(s Settings) string {
	port, debug, name := "unset", "unset", "unset"
	if s.Port != nil {
		port = strconv.Itoa(*s.Port)
	}
	if s.Debug != nil {
		debug = strconv.FormatBool(*s.Debug)
	}
	if s.Name != nil {
		name = *s.Name
	}
	return fmt.Sprintf("port=%s debug=%s name=%s", port, debug, name)
}

// ParseOptionalInt lit un entier facultatif : une chaîne vide (ou d'espaces) donne (nil, nil) ;
// un entier valide donne un pointeur vers sa valeur ; sinon (nil, erreur).
func ParseOptionalInt(s string) (*int, error) {
	s = strings.TrimSpace(s)
	if s == "" {
		return nil, nil
	}
	n, err := strconv.Atoi(s)
	if err != nil {
		return nil, fmt.Errorf("entier attendu : %w", err)
	}
	return &n, nil
}

// ErrEmptyBuffer est renvoyée par ReadChunks quand le tampon fourni est vide.
var ErrEmptyBuffer = errors.New("tampon vide")

// ReadChunks lit r par morceaux dans buf et appelle handle pour chacun (une vue sur buf, valable
// seulement pendant l'appel). Elle s'arrête sans erreur à la fin des données (io.EOF), et renvoie
// la première erreur de lecture ou de handle. Elle n'alloue rien dans sa boucle.
func ReadChunks(r io.Reader, buf []byte, handle func(chunk []byte) error) error {
	if len(buf) == 0 {
		return ErrEmptyBuffer
	}
	for {
		n, err := r.Read(buf)
		if n > 0 {
			if handleErr := handle(buf[:n]); handleErr != nil {
				return handleErr
			}
		}
		if errors.Is(err, io.EOF) {
			return nil
		}
		if err != nil {
			return err
		}
	}
}
