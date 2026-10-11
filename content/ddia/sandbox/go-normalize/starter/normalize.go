package lab

// Position est un poste dans un CV : le nom de l'organisation est du texte copié dans chaque CV.
type Position struct {
	Title        string
	Organization string
}

// Profile est un CV stocké comme un document.
type Profile struct {
	UserID    int
	Name      string
	Positions []Position
}

// UserRow, OrgRow et PositionRow sont les lignes des trois tables du schéma normalisé.
type UserRow struct {
	UserID int
	Name   string
}

type OrgRow struct {
	ID   int
	Name string
}

type PositionRow struct {
	UserID int
	Title  string
	OrgID  int // clé étrangère vers OrgRow.ID
}

// DB est le schéma normalisé.
type DB struct {
	Users     []UserRow
	Orgs      []OrgRow
	Positions []PositionRow
}

// Normalize éclate les documents en tables. Chaque nom d'organisation distinct reçoit un identifiant,
// numéroté à partir de 1 dans l'ordre de première apparition. L'ordre des utilisateurs et des postes est conservé.
func Normalize(profiles []Profile) DB {
	// TODO
	panic("à implémenter")
}

// Join reconstruit les documents à partir des tables (la jointure). Un utilisateur sans poste a Positions == nil.
func (db DB) Join() []Profile {
	// TODO
	panic("à implémenter")
}

// RenameOrg renomme l'organisation d'identifiant id. Renvoie false si elle n'existe pas.
// Une seule ligne est modifiée, quel que soit le nombre de CV qui la mentionnent.
func (db *DB) RenameOrg(id int, name string) bool {
	// TODO
	panic("à implémenter")
}

// RenameInDocuments renomme l'organisation old en new dans chaque document et renvoie le nombre de copies réécrites.
func RenameInDocuments(profiles []Profile, old, new string) int {
	// TODO
	panic("à implémenter")
}
