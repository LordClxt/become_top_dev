package lab

import (
	"errors"
	"fmt"
	"maps"
	"reflect"
	"slices"
	"strings"
)

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

func version(d Doc) int {
	if v, ok := d[versionKey].(int); ok {
		return v
	}
	return 1
}

// --- Jalon 1 ---

// Put enregistre une copie de d sous l'identifiant id, estampillée de la version courante.
func (c *Collection) Put(id string, d Doc) {
	cp := deepCopy(d).(Doc)
	cp[versionKey] = c.CurrentVersion()
	c.docs[id] = cp
}

// PutRaw enregistre une copie de d telle quelle (sans modifier "_v"; absent, la version est 1). Sert à charger
// des données écrites par d'anciennes versions.
func (c *Collection) PutRaw(id string, d Doc) {
	c.docs[id] = deepCopy(d).(Doc)
}

// Raw renvoie une copie du document tel qu'il est stocké, sans mise à niveau.
func (c *Collection) Raw(id string) (Doc, bool) {
	d, ok := c.docs[id]
	if !ok {
		return nil, false
	}
	return deepCopy(d).(Doc), true
}

// Delete supprime un document ; false s'il n'existe pas.
func (c *Collection) Delete(id string) bool {
	_, ok := c.docs[id]
	delete(c.docs, id)
	return ok
}

// Len renvoie le nombre de documents.
func (c *Collection) Len() int { return len(c.docs) }

// lookup suit un chemin pointé ("address.city") dans d.
func lookup(d Doc, path string) (any, bool) {
	var cur any = d
	for _, part := range strings.Split(path, ".") {
		m, ok := cur.(map[string]any)
		if !ok {
			return nil, false
		}
		cur, ok = m[part]
		if !ok {
			return nil, false
		}
	}
	return cur, true
}

// --- Jalon 2 ---

// upgrade fait passer une copie de d à la version courante.
func (c *Collection) upgrade(d Doc) (Doc, error) {
	v := version(d)
	if v > c.CurrentVersion() {
		return nil, fmt.Errorf("%w (%d > %d)", ErrFutureVersion, v, c.CurrentVersion())
	}
	d = deepCopy(d).(Doc)
	for ; v < c.CurrentVersion(); v++ {
		next, err := c.upgraders[v-1](d)
		if err != nil {
			return nil, fmt.Errorf("mise à niveau v%d → v%d : %w", v, v+1, err)
		}
		d = next
		d[versionKey] = v + 1
	}
	return d, nil
}

// Get renvoie une copie du document à la version courante. Un document plus ancien est mis à niveau à la lecture
// (le stockage n'est pas modifié). ErrNotFound s'il n'existe pas ; ErrFutureVersion si "_v" dépasse la version
// courante ; l'erreur d'un Upgrader est renvoyée enveloppée (errors.Is fonctionne).
func (c *Collection) Get(id string) (Doc, error) {
	raw, ok := c.docs[id]
	if !ok {
		return nil, ErrNotFound
	}
	return c.upgrade(raw)
}

// --- Jalon 3 ---

// Find renvoie, triés, les identifiants des documents dont la valeur au chemin pointé path est égale à value
// (reflect.DeepEqual), après mise à niveau : un ancien document est trouvé comme s'il était à jour.
// Un document illisible (erreur de mise à niveau ou version future) est ignoré.
func (c *Collection) Find(path string, value any) []string {
	var ids []string
	for id, raw := range c.docs {
		d, err := c.upgrade(raw)
		if err != nil {
			continue
		}
		if got, ok := lookup(d, path); ok && reflect.DeepEqual(got, value) {
			ids = append(ids, id)
		}
	}
	slices.Sort(ids)
	return ids
}

// PendingMigration renvoie le nombre de documents stockés dont la version est inférieure à la version courante.
func (c *Collection) PendingMigration() int {
	n := 0
	for _, d := range c.docs {
		if version(d) < c.CurrentVersion() {
			n++
		}
	}
	return n
}

// Migrate réécrit dans le stockage tous les documents anciens à la version courante et renvoie leur nombre.
// Les identifiants sont traités par ordre alphabétique ; au premier échec, la migration s'arrête et renvoie le nombre
// de documents déjà migrés avec l'erreur.
func (c *Collection) Migrate() (int, error) {
	migrated := 0
	for _, id := range slices.Sorted(maps.Keys(c.docs)) {
		raw := c.docs[id]
		if version(raw) >= c.CurrentVersion() {
			continue
		}
		d, err := c.upgrade(raw)
		if err != nil {
			return migrated, fmt.Errorf("document %q : %w", id, err)
		}
		c.docs[id] = d
		migrated++
	}
	return migrated, nil
}
