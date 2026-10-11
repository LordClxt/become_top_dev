package lab

import (
	"errors"
	"strings"
)

// User est la forme que le code de l'application attend (le schéma implicite).
type User struct {
	FirstName string
	LastName  string
}

var (
	// ErrNoName : le document n'a ni "first_name" ni "name".
	ErrNoName = errors.New("document sans nom")
	// ErrBadType : un champ de nom n'est pas une chaîne.
	ErrBadType = errors.New("champ de nom de type invalide")
)

// stringField lit une clé chaîne : (valeur, présente, erreur de type).
func stringField(doc map[string]any, key string) (string, bool, error) {
	raw, ok := doc[key]
	if !ok {
		return "", false, nil
	}
	s, ok := raw.(string)
	if !ok {
		return "", true, ErrBadType
	}
	return s, true, nil
}

// ReadUser lit un document de n'importe quelle version.
//
//   - v2 : "first_name" (et "last_name", facultatif) → utilisés tels quels.
//   - v1 : "name" seul, "Prénom Reste du nom" → coupé au premier espace après suppression des espaces autour.
//     Un nom d'un seul mot donne un prénom et un nom de famille vide.
//
// "first_name" l'emporte si les deux versions sont présentes. Aucun des deux champs : ErrNoName.
// Un champ de nom qui n'est pas une chaîne : ErrBadType.
func ReadUser(doc map[string]any) (User, error) {
	first, hasFirst, err := stringField(doc, "first_name")
	if err != nil {
		return User{}, err
	}
	if hasFirst {
		last, _, err := stringField(doc, "last_name")
		if err != nil {
			return User{}, err
		}
		return User{FirstName: first, LastName: last}, nil
	}
	name, hasName, err := stringField(doc, "name")
	if err != nil {
		return User{}, err
	}
	name = strings.TrimSpace(name)
	if !hasName || name == "" {
		return User{}, ErrNoName
	}
	first, last, _ := strings.Cut(name, " ")
	return User{FirstName: first, LastName: strings.TrimSpace(last)}, nil
}

// Migrate réécrit en place les documents v1 en v2 (ajoute first_name/last_name, supprime name) et renvoie
// le nombre de documents modifiés. Les documents déjà en v2 ne changent pas ; le premier document illisible
// arrête la migration et son erreur est renvoyée avec le nombre de documents déjà migrés.
func Migrate(docs []map[string]any) (int, error) {
	migrated := 0
	for _, doc := range docs {
		if _, ok := doc["first_name"]; ok {
			continue
		}
		u, err := ReadUser(doc)
		if err != nil {
			return migrated, err
		}
		doc["first_name"] = u.FirstName
		doc["last_name"] = u.LastName
		delete(doc, "name")
		migrated++
	}
	return migrated, nil
}
