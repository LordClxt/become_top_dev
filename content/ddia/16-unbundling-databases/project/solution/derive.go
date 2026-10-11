package lab

import (
	"errors"
	"sort"
)

// Event est un changement lu dans le log de la base de référence. (fourni)
// Offset est strictement croissant dans le log ; Deleted signale la suppression du document Key.
type Event struct {
	Offset  int64
	Key     string
	Deleted bool
	Doc     map[string]string
}

// View est une donnée dérivée maintenue à partir du log. (fourni)
type View interface {
	// Apply applique un événement. Un événement dont l'offset est déjà appliqué est ignoré (idempotence).
	Apply(ev Event) error
	// Offset renvoie l'offset du dernier événement appliqué (0 si aucun).
	Offset() int64
}

// KeyFunc extrait d'un document la valeur de regroupement ; ok vaut false si le document n'a pas de groupe. (fourni)
type KeyFunc func(doc map[string]string) (group string, ok bool)

// Erreurs à renvoyer. (fournies)
var (
	ErrBadOffset   = errors.New("offset invalide : il doit être strictement positif")
	ErrEmptyKey    = errors.New("clé de document vide")
	ErrOutOfOrder  = errors.New("log non ordonné : les offsets doivent être strictement croissants")
	ErrNotCaughtUp = errors.New("la nouvelle vue n'a pas rattrapé l'ancienne")
	ErrNotSwitched = errors.New("la bascule n'a pas encore eu lieu")
	ErrRetired     = errors.New("l'ancienne vue n'est plus maintenue")
)

// Field renvoie une KeyFunc qui regroupe selon la valeur d'un champ (absent ou vide : pas de groupe). (fourni)
func Field(name string) KeyFunc {
	return func(doc map[string]string) (string, bool) {
		v, ok := doc[name]
		return v, ok && v != ""
	}
}

func validate(ev Event) error {
	if ev.Offset <= 0 {
		return ErrBadOffset
	}
	if ev.Key == "" {
		return ErrEmptyKey
	}
	return nil
}

// ---------- Jalon 1 : l'index secondaire ----------

// Index est un index secondaire : valeur d'un champ → clés des documents qui la portent.
type Index struct {
	key    KeyFunc
	offset int64
	byKey  map[string]string
	byVal  map[string]map[string]struct{}
}

// NewIndex crée un index vide sur le champ field.
func NewIndex(field string) *Index {
	return &Index{key: Field(field), byKey: map[string]string{}, byVal: map[string]map[string]struct{}{}}
}

// Offset renvoie l'offset du dernier événement appliqué.
func (ix *Index) Offset() int64 { return ix.offset }

// Apply met l'index à jour : retire l'ancienne entrée du document, puis ajoute la nouvelle s'il y en a une.
func (ix *Index) Apply(ev Event) error {
	if err := validate(ev); err != nil {
		return err
	}
	if ev.Offset <= ix.offset {
		return nil
	}
	if old, ok := ix.byKey[ev.Key]; ok {
		delete(ix.byKey, ev.Key)
		delete(ix.byVal[old], ev.Key)
		if len(ix.byVal[old]) == 0 {
			delete(ix.byVal, old)
		}
	}
	if !ev.Deleted {
		if v, ok := ix.key(ev.Doc); ok {
			ix.byKey[ev.Key] = v
			if ix.byVal[v] == nil {
				ix.byVal[v] = map[string]struct{}{}
			}
			ix.byVal[v][ev.Key] = struct{}{}
		}
	}
	ix.offset = ev.Offset
	return nil
}

// Lookup renvoie les clés des documents dont le champ vaut value, triées (slice vide si aucune).
func (ix *Index) Lookup(value string) []string {
	keys := make([]string, 0, len(ix.byVal[value]))
	for k := range ix.byVal[value] {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	return keys
}

// ---------- Jalon 2 : la vue de compteurs et la reconstruction ----------

// Counter compte les documents vivants par groupe.
type Counter struct {
	key    KeyFunc
	offset int64
	group  map[string]string
	counts map[string]int
}

// NewCounter crée une vue de compteurs vide qui regroupe selon key.
func NewCounter(key KeyFunc) *Counter {
	return &Counter{key: key, group: map[string]string{}, counts: map[string]int{}}
}

// Offset renvoie l'offset du dernier événement appliqué.
func (c *Counter) Offset() int64 { return c.offset }

// Apply décrémente l'ancien groupe du document puis incrémente le nouveau.
func (c *Counter) Apply(ev Event) error {
	if err := validate(ev); err != nil {
		return err
	}
	if ev.Offset <= c.offset {
		return nil
	}
	if old, ok := c.group[ev.Key]; ok {
		delete(c.group, ev.Key)
		c.counts[old]--
		if c.counts[old] == 0 {
			delete(c.counts, old)
		}
	}
	if !ev.Deleted {
		if g, ok := c.key(ev.Doc); ok {
			c.group[ev.Key] = g
			c.counts[g]++
		}
	}
	c.offset = ev.Offset
	return nil
}

// Count renvoie le nombre de documents du groupe.
func (c *Counter) Count(group string) int { return c.counts[group] }

// Counts renvoie une copie des compteurs non nuls.
func (c *Counter) Counts() map[string]int {
	out := make(map[string]int, len(c.counts))
	for g, n := range c.counts {
		out[g] = n
	}
	return out
}

// CatchUp applique à v, dans l'ordre, les événements du log plus récents que v.Offset(), et renvoie leur nombre.
// Un log dont les offsets ne sont pas strictement croissants est refusé (ErrOutOfOrder) avant toute application.
func CatchUp(v View, log []Event) (int, error) {
	for i := 1; i < len(log); i++ {
		if log[i].Offset <= log[i-1].Offset {
			return 0, ErrOutOfOrder
		}
	}
	applied := 0
	for _, ev := range log {
		if ev.Offset <= v.Offset() {
			continue
		}
		if err := v.Apply(ev); err != nil {
			return applied, err
		}
		applied++
	}
	return applied, nil
}

// ---------- Jalon 3 : deux vues en parallèle, puis bascule ----------

// Migration maintient une ancienne et une nouvelle vue dérivées du même log, et choisit celle qu'on lit.
type Migration struct {
	old, next View
	switched  bool
	retired   bool
}

// NewMigration démarre une migration : les lectures vont à old tant que la bascule n'a pas eu lieu.
func NewMigration(old, next View) *Migration {
	return &Migration{old: old, next: next}
}

// Apply applique un événement en direct. L'ancienne vue le reçoit tant qu'elle n'est pas retirée. La nouvelle ne le
// reçoit que si elle a rattrapé l'ancienne : sinon, elle sauterait les offsets manquants, qu'elle relira par Backfill.
func (m *Migration) Apply(ev Event) error {
	if err := validate(ev); err != nil {
		return err
	}
	caughtUp := m.Ready()
	if !m.retired {
		if err := m.old.Apply(ev); err != nil {
			return err
		}
	}
	if !caughtUp {
		return nil
	}
	return m.next.Apply(ev)
}

// Backfill fait rattraper l'historique à la nouvelle vue, sans toucher à l'ancienne.
func (m *Migration) Backfill(log []Event) error {
	_, err := CatchUp(m.next, log)
	return err
}

// Ready indique si la nouvelle vue a au moins rattrapé l'ancienne.
func (m *Migration) Ready() bool {
	return m.retired || m.next.Offset() >= m.old.Offset()
}

// Switch envoie les lectures vers la nouvelle vue ; refusé tant qu'elle est en retard.
func (m *Migration) Switch() error {
	if !m.Ready() {
		return ErrNotCaughtUp
	}
	m.switched = true
	return nil
}

// Rollback renvoie les lectures vers l'ancienne vue, tant qu'elle est encore maintenue.
func (m *Migration) Rollback() error {
	if m.retired {
		return ErrRetired
	}
	m.switched = false
	return nil
}

// Retire arrête de maintenir l'ancienne vue ; possible seulement après la bascule.
func (m *Migration) Retire() error {
	if !m.switched {
		return ErrNotSwitched
	}
	m.retired = true
	return nil
}

// Current renvoie la vue à laquelle les lectures doivent s'adresser.
func (m *Migration) Current() View {
	if m.switched {
		return m.next
	}
	return m.old
}
