package lab

// Row est une ligne d'une table d'annuaire.
type Row struct {
	ID    int
	Last  string
	First string
	City  string
}

// Secondary est un index secondaire : valeur d'une colonne → liste triée des identifiants de lignes.
type Secondary struct {
	col func(Row) string
	ids map[string][]int
}

// NewSecondary crée un index secondaire sur la colonne extraite par col.
func NewSecondary(col func(Row) string) *Secondary {
	// TODO
	panic("à implémenter")
}

// Add indexe une ligne (sans doublon si la même ligne est ajoutée deux fois). Les identifiants restent triés.
func (s *Secondary) Add(r Row) {
	// TODO
	panic("à implémenter")
}

// Remove retire une ligne de l'index (sans effet si elle n'y est pas). Une valeur sans ligne disparaît de l'index.
func (s *Secondary) Remove(r Row) {
	// TODO
	panic("à implémenter")
}

// Lookup renvoie une copie des identifiants triés des lignes ayant cette valeur.
func (s *Secondary) Lookup(value string) []int {
	// TODO
	panic("à implémenter")
}

// Concat est un index concaténé : les lignes sont triées par la concaténation des colonnes, dans l'ordre déclaré.
type Concat struct {
	cols    []func(Row) string
	entries []concatEntry // à garder trié par (key, id)
}

type concatEntry struct {
	key string
	id  int
}

// NewConcat crée un index concaténé sur les colonnes, dans cet ordre.
func NewConcat(cols ...func(Row) string) *Concat {
	// TODO
	panic("à implémenter")
}

// Add indexe une ligne. Astuce : construis la clé en terminant chaque colonne par "\x00" pour que « Du » ne soit pas
// un préfixe de « Dupont ».
func (c *Concat) Add(r Row) {
	// TODO
	panic("à implémenter")
}

// Lookup renvoie les identifiants des lignes dont les premières colonnes valent prefix, dans l'ordre de l'index
// (par clé concaténée, puis par identifiant). Un préfixe vide renvoie tout l'index ; un préfixe plus long que
// le nombre de colonnes renvoie nil.
func (c *Concat) Lookup(prefix ...string) []int {
	// TODO
	panic("à implémenter")
}

// UsablePrefix renvoie le nombre de colonnes de tête de l'index (dans leur ordre) que la requête contraint par égalité :
// on s'arrête à la première colonne non contrainte.
func UsablePrefix(index []string, constrained map[string]bool) int {
	// TODO
	panic("à implémenter")
}

// Covers indique si un index (colonnes de clé indexCols plus colonnes incluses included) peut répondre seul à une
// requête qui sélectionne `selected` et filtre sur `filtered` : toutes ces colonnes doivent s'y trouver.
func Covers(indexCols, included, selected, filtered []string) bool {
	// TODO
	panic("à implémenter")
}
