package lab

import "errors"

// Doc est un document JSON simplifié (map, slice, chaîne, nombre, booléen, nil).
type Doc = map[string]any

// Upgrader transforme un document de la version n vers la version n+1. Il peut modifier et renvoyer d.
type Upgrader func(d Doc) (Doc, error)

var (
	// ErrNotFound : aucun document avec cet identifiant.
	ErrNotFound = errors.New("document introuvable")
	// ErrFutureVersion : le document a été écrit par une version plus récente que celle de la collection.
	ErrFutureVersion = errors.New("document d'une version plus récente")
)

const versionKey = "_v"

// Collection est une collection de documents versionnés de Tinybase. Le champ "_v" porte la version du schéma.
type Collection struct {
	upgraders []Upgrader
	docs      map[string]Doc
}

// NewCollection crée une collection. upgraders[i] fait passer un document de la version i+1 à la version i+2 ;
// la version courante vaut donc len(upgraders)+1.
func NewCollection(upgraders ...Upgrader) *Collection {
	return &Collection{upgraders: upgraders, docs: map[string]Doc{}}
}

// CurrentVersion renvoie la version courante du schéma.
func (c *Collection) CurrentVersion() int { return len(c.upgraders) + 1 }

// --- Jalon 1 : stocker et retrouver ---

// Put enregistre une copie profonde de d sous l'identifiant id, estampillée de la version courante.
// Modifier d après coup ne doit pas changer le document stocké.
func (c *Collection) Put(id string, d Doc) {
	// TODO
	panic("à implémenter")
}

// PutRaw enregistre une copie profonde de d telle quelle (sans modifier "_v" ; absent, la version est 1).
// Sert à charger des données écrites par d'anciennes versions.
func (c *Collection) PutRaw(id string, d Doc) {
	// TODO
	panic("à implémenter")
}

// Raw renvoie une copie profonde du document tel qu'il est stocké, sans mise à niveau.
func (c *Collection) Raw(id string) (Doc, bool) {
	// TODO
	panic("à implémenter")
}

// Delete supprime un document ; false s'il n'existe pas.
func (c *Collection) Delete(id string) bool {
	// TODO
	panic("à implémenter")
}

// Len renvoie le nombre de documents.
func (c *Collection) Len() int {
	// TODO
	panic("à implémenter")
}

// --- Jalon 2 : schema-on-read ---

// Get renvoie une copie du document à la version courante. Un document plus ancien est mis à niveau à la lecture
// en appliquant les Upgrader dans l'ordre (le stockage n'est pas modifié) ; "_v" vaut alors la version courante.
// ErrNotFound s'il n'existe pas ; ErrFutureVersion si "_v" dépasse la version courante ;
// l'erreur d'un Upgrader est renvoyée enveloppée avec %w (errors.Is fonctionne).
func (c *Collection) Get(id string) (Doc, error) {
	// TODO
	panic("à implémenter")
}

// --- Jalon 3 : recherche et migration ---

// Find renvoie, triés, les identifiants des documents dont la valeur au chemin pointé path ("address.city")
// est égale à value (reflect.DeepEqual), après mise à niveau : un ancien document est trouvé comme s'il était à jour.
// Un document illisible (erreur de mise à niveau ou version future) est ignoré.
func (c *Collection) Find(path string, value any) []string {
	// TODO
	panic("à implémenter")
}

// PendingMigration renvoie le nombre de documents stockés dont la version est inférieure à la version courante.
func (c *Collection) PendingMigration() int {
	// TODO
	panic("à implémenter")
}

// Migrate réécrit dans le stockage tous les documents anciens à la version courante et renvoie leur nombre.
// Les identifiants sont traités par ordre alphabétique ; au premier échec, la migration s'arrête et renvoie le nombre
// de documents déjà migrés avec l'erreur.
func (c *Collection) Migrate() (int, error) {
	// TODO
	panic("à implémenter")
}

// --- Aides fournies ---

// deepCopy copie récursivement maps et slices d'un document.
func deepCopy(v any) any {
	switch x := v.(type) {
	case map[string]any:
		out := make(map[string]any, len(x))
		for k, e := range x {
			out[k] = deepCopy(e)
		}
		return out
	case []any:
		out := make([]any, len(x))
		for i, e := range x {
			out[i] = deepCopy(e)
		}
		return out
	default:
		return v
	}
}

// version renvoie le "_v" d'un document (1 s'il est absent).
func version(d Doc) int {
	if v, ok := d[versionKey].(int); ok {
		return v
	}
	return 1
}
