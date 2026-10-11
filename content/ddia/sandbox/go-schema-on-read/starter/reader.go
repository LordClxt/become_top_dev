package lab

import "errors"

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

// ReadUser lit un document de n'importe quelle version.
//
//   - v2 : "first_name" (et "last_name", facultatif) → utilisés tels quels.
//   - v1 : "name" seul, "Prénom Reste du nom" → coupé au premier espace après suppression des espaces autour.
//     Un nom d'un seul mot donne un prénom et un nom de famille vide.
//
// "first_name" l'emporte si les deux versions sont présentes. Aucun des deux champs (ou "name" vide) : ErrNoName.
// Un champ de nom qui n'est pas une chaîne : ErrBadType.
func ReadUser(doc map[string]any) (User, error) {
	// TODO
	panic("à implémenter")
}

// Migrate réécrit en place les documents v1 en v2 (ajoute first_name/last_name, supprime name) et renvoie
// le nombre de documents modifiés. Les documents déjà en v2 ne changent pas ; le premier document illisible
// arrête la migration et son erreur est renvoyée avec le nombre de documents déjà migrés.
func Migrate(docs []map[string]any) (int, error) {
	// TODO
	panic("à implémenter")
}
