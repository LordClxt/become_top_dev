package lab

import "errors"

// Table range ses données par colonne : un tableau de valeurs par nom de colonne, toutes de même longueur.
type Table struct {
	names []string
	cols  map[string][]string
	n     int
}

// New crée une table vide avec ces colonnes, dans cet ordre. (fourni)
func New(names ...string) *Table {
	t := &Table{names: append([]string(nil), names...), cols: map[string][]string{}}
	for _, name := range names {
		t.cols[name] = nil
	}
	return t
}

// Len renvoie le nombre de lignes. (fourni)
func (t *Table) Len() int { return t.n }

// ---------- Jalon 1 : le stockage par colonne ----------

// Append ajoute une ligne : une valeur par colonne, dans l'ordre de New. Nombre de valeurs différent : erreur.
func (t *Table) Append(row ...string) error {
	// TODO: ajouter chaque valeur à SA colonne
	return errors.New("à implémenter")
}

// Column renvoie une copie d'une colonne, ou nil si elle n'existe pas.
func (t *Table) Column(name string) []string {
	// TODO
	return nil
}

// Row reconstitue la i-ième ligne (dans l'ordre des colonnes), ou nil si i est hors limites.
func (t *Table) Row(i int) []string {
	// TODO: la i-ième valeur de chaque colonne
	return nil
}

// ---------- Jalon 2 : bitmaps et compression ----------

// Bitmap renvoie un booléen par ligne : vrai si la ligne vaut value.
func Bitmap(col []string, value string) []bool {
	// TODO
	return nil
}

// And renvoie le ET bit à bit de deux bitmaps de même longueur, ou nil si les longueurs diffèrent.
func And(a, b []bool) []bool {
	// TODO
	return nil
}

// Or renvoie le OU bit à bit de deux bitmaps de même longueur, ou nil si les longueurs diffèrent.
func Or(a, b []bool) []bool {
	// TODO
	return nil
}

// Encode compresse un bitmap en longueurs de séquences alternées, en commençant par une séquence de faux
// (éventuellement de longueur 0). Un bitmap vide donne une slice vide non nil.
func Encode(bits []bool) []int {
	// TODO
	return nil
}

// Decode est l'inverse d'Encode.
func Decode(runs []int) []bool {
	// TODO
	return nil
}

// ---------- Jalon 3 : tri et requêtes ----------

// SortBy trie les lignes entières (de façon stable) selon ces colonnes, dans l'ordre, par comparaison de chaînes.
// Colonne inconnue : erreur, et la table n'est pas modifiée.
func (t *Table) SortBy(names ...string) error {
	// TODO: calculer UNE permutation puis l'appliquer à TOUTES les colonnes
	return errors.New("à implémenter")
}

// Runs compte les séquences de valeurs identiques consécutives dans une colonne.
func Runs(col []string) int {
	// TODO
	return -1
}

// SumWhere additionne la colonne measure (des entiers) sur les lignes qui vérifient tous les filtres colonne = valeur.
// Sans filtre, toutes les lignes comptent. Colonne inconnue ou valeur non entière : erreur.
func (t *Table) SumWhere(measure string, filters map[string]string) (int, error) {
	// TODO: ET des bitmaps de chaque filtre, puis somme de la mesure
	return 0, errors.New("à implémenter")
}
