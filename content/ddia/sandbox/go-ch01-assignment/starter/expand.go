package lab

// Doc est un document JSON simplifié.
type Doc map[string]any

// Store est une base de documents en mémoire, organisée en collections. Elle compte les requêtes reçues,
// comme le ferait un client réseau.
type Store struct {
	colls   map[string]map[string]Doc
	queries int
}

// NewStore crée une base vide.
func NewStore() *Store {
	return &Store{colls: map[string]map[string]Doc{}}
}

// Put enregistre le document id dans la collection coll (n'est pas compté comme une requête de lecture).
func (s *Store) Put(coll, id string, d Doc) {
	if s.colls[coll] == nil {
		s.colls[coll] = map[string]Doc{}
	}
	s.colls[coll][id] = d
}

// Get lit un document : une requête.
func (s *Store) Get(coll, id string) (Doc, bool) {
	// TODO
	panic("à implémenter")
}

// GetMany lit plusieurs documents d'une même collection en une seule requête. Les identifiants absents
// n'apparaissent pas dans le résultat. Avec ids vide, aucune requête n'est émise.
func (s *Store) GetMany(coll string, ids []string) map[string]Doc {
	// TODO
	panic("à implémenter")
}

// Queries renvoie le nombre de requêtes de lecture émises depuis la création.
func (s *Store) Queries() int {
	// TODO
	panic("à implémenter")
}

// ExpandNaive lit les documents ids de coll, puis résout chaque référence (champ → collection de refs)
// avec une requête par document et par champ (le problème « N+1 »). Les documents absents sont ignorés.
// Un champ de référence absent ou qui n'est pas une chaîne est laissé tel quel ; une référence introuvable devient nil.
// Les documents du Store ne sont pas modifiés ; le résultat suit l'ordre de ids.
func ExpandNaive(s *Store, coll string, ids []string, refs map[string]string) []Doc {
	// TODO
	panic("à implémenter")
}

// Expand produit le même résultat que ExpandNaive avec au plus 1 + len(refs) requêtes : une pour les documents,
// puis une par champ de référence portant sur les identifiants distincts de ce champ.
func Expand(s *Store, coll string, ids []string, refs map[string]string) []Doc {
	// TODO
	panic("à implémenter")
}
