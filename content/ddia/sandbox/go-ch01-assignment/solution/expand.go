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
	s.queries++
	d, ok := s.colls[coll][id]
	return d, ok
}

// GetMany lit plusieurs documents d'une même collection en une seule requête. Les identifiants absents
// n'apparaissent pas dans le résultat. Avec ids vide, aucune requête n'est émise.
func (s *Store) GetMany(coll string, ids []string) map[string]Doc {
	out := make(map[string]Doc, len(ids))
	if len(ids) == 0 {
		return out
	}
	s.queries++
	for _, id := range ids {
		if d, ok := s.colls[coll][id]; ok {
			out[id] = d
		}
	}
	return out
}

// Queries renvoie le nombre de requêtes de lecture émises depuis la création.
func (s *Store) Queries() int { return s.queries }

// withRefs renvoie une copie superficielle de d où chaque champ de refs est remplacé par le document référencé
// (résolu par resolve ; nil si introuvable). Les champs absents ou qui ne sont pas des chaînes sont laissés tels quels.
func withRefs(d Doc, refs map[string]string, resolve func(coll, id string) Doc) Doc {
	out := make(Doc, len(d))
	for k, v := range d {
		out[k] = v
	}
	for field, coll := range refs {
		id, ok := d[field].(string)
		if !ok {
			continue
		}
		if target := resolve(coll, id); target != nil {
			out[field] = target
		} else {
			out[field] = nil
		}
	}
	return out
}

// ExpandNaive lit les documents ids de coll, puis résout chaque référence (champ → collection de refs)
// avec une requête par document et par champ (le problème « N+1 »). Les documents absents sont ignorés.
// Les documents du Store ne sont pas modifiés ; le résultat suit l'ordre de ids.
func ExpandNaive(s *Store, coll string, ids []string, refs map[string]string) []Doc {
	var out []Doc
	for _, id := range ids {
		d, ok := s.Get(coll, id)
		if !ok {
			continue
		}
		out = append(out, withRefs(d, refs, func(c, rid string) Doc {
			t, _ := s.Get(c, rid)
			return t
		}))
	}
	return out
}

// Expand produit le même résultat que ExpandNaive avec au plus 1 + len(refs) requêtes : une pour les documents,
// puis une par champ de référence portant sur les identifiants distincts de ce champ.
func Expand(s *Store, coll string, ids []string, refs map[string]string) []Doc {
	docs := s.GetMany(coll, ids)

	// Pour chaque champ, rassemble les identifiants distincts à résoudre, puis les lit en une requête.
	resolved := map[string]map[string]Doc{}
	for field, refColl := range refs {
		seen := map[string]bool{}
		var want []string
		for _, id := range ids {
			if rid, ok := docs[id][field].(string); ok && !seen[rid] {
				seen[rid] = true
				want = append(want, rid)
			}
		}
		resolved[field] = s.GetMany(refColl, want)
	}

	var out []Doc
	for _, id := range ids {
		d, ok := docs[id]
		if !ok {
			continue
		}
		expanded := make(Doc, len(d))
		for k, v := range d {
			expanded[k] = v
		}
		for field := range refs {
			rid, ok := d[field].(string)
			if !ok {
				continue
			}
			if target, found := resolved[field][rid]; found {
				expanded[field] = target
			} else {
				expanded[field] = nil
			}
		}
		out = append(out, expanded)
	}
	return out
}
