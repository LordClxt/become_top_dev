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
	var db DB
	ids := map[string]int{}
	for _, p := range profiles {
		db.Users = append(db.Users, UserRow{UserID: p.UserID, Name: p.Name})
		for _, pos := range p.Positions {
			id, ok := ids[pos.Organization]
			if !ok {
				id = len(db.Orgs) + 1
				ids[pos.Organization] = id
				db.Orgs = append(db.Orgs, OrgRow{ID: id, Name: pos.Organization})
			}
			db.Positions = append(db.Positions, PositionRow{UserID: p.UserID, Title: pos.Title, OrgID: id})
		}
	}
	return db
}

// Join reconstruit les documents à partir des tables (la jointure). Un utilisateur sans poste a Positions == nil.
func (db DB) Join() []Profile {
	orgName := make(map[int]string, len(db.Orgs))
	for _, o := range db.Orgs {
		orgName[o.ID] = o.Name
	}
	byUser := make(map[int][]Position)
	for _, row := range db.Positions {
		byUser[row.UserID] = append(byUser[row.UserID], Position{Title: row.Title, Organization: orgName[row.OrgID]})
	}
	var out []Profile
	for _, u := range db.Users {
		out = append(out, Profile{UserID: u.UserID, Name: u.Name, Positions: byUser[u.UserID]})
	}
	return out
}

// RenameOrg renomme l'organisation d'identifiant id. Renvoie false si elle n'existe pas.
// Une seule ligne est modifiée, quel que soit le nombre de CV qui la mentionnent.
func (db *DB) RenameOrg(id int, name string) bool {
	for i := range db.Orgs {
		if db.Orgs[i].ID == id {
			db.Orgs[i].Name = name
			return true
		}
	}
	return false
}

// RenameInDocuments renomme l'organisation old en new dans chaque document et renvoie le nombre de copies réécrites.
func RenameInDocuments(profiles []Profile, old, new string) int {
	n := 0
	for i := range profiles {
		for j := range profiles[i].Positions {
			if profiles[i].Positions[j].Organization == old {
				profiles[i].Positions[j].Organization = new
				n++
			}
		}
	}
	return n
}
