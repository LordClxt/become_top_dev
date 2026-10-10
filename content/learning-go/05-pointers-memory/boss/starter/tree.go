package lab

// Tree est un nœud d'arbre binaire de recherche d'entiers, sans doublon :
// toutes les valeurs de Left sont plus petites que Value, toutes celles de Right plus grandes.
// Un arbre vide est un pointeur nil.
type Tree struct {
	Value       int
	Left, Right *Tree
}

// Insert ajoute v à l'arbre de racine root et renvoie la racine, qui change quand l'arbre était vide
// (une fonction ne peut pas rendre non nil le pointeur de l'appelant : elle le renvoie).
// Une valeur déjà présente est ignorée.
func Insert(root *Tree, v int) *Tree {
	// TODO
	panic("à implémenter")
}

// Contains indique si v est dans l'arbre.
func Contains(root *Tree, v int) bool {
	// TODO
	panic("à implémenter")
}

// Min renvoie la plus petite valeur. ok vaut false pour un arbre vide.
func Min(root *Tree) (v int, ok bool) {
	// TODO
	panic("à implémenter")
}

// Max renvoie la plus grande valeur. ok vaut false pour un arbre vide.
func Max(root *Tree) (v int, ok bool) {
	// TODO
	panic("à implémenter")
}

// Delete supprime v et renvoie la nouvelle racine. Un nœud à deux enfants est remplacé par son successeur
// (la plus petite valeur de son sous-arbre droit). Si v est absent, l'arbre est inchangé.
func Delete(root *Tree, v int) *Tree {
	// TODO
	panic("à implémenter")
}

// Size renvoie le nombre de nœuds.
func Size(root *Tree) int {
	// TODO
	panic("à implémenter")
}

// Height renvoie la hauteur : 0 pour un arbre vide, 1 pour un seul nœud.
func Height(root *Tree) int {
	// TODO
	panic("à implémenter")
}

// Walk visite les valeurs en ordre croissant et s'arrête dès que visit renvoie false.
func Walk(root *Tree, visit func(v int) bool) {
	// TODO
	panic("à implémenter")
}

// InOrder renvoie les valeurs en ordre croissant.
func InOrder(root *Tree) []int {
	// TODO
	panic("à implémenter")
}

// FromSorted construit un arbre équilibré (hauteur minimale) à partir de valeurs triées par ordre
// strictement croissant. Les valeurs de la slice ne sont pas modifiées.
func FromSorted(values []int) *Tree {
	// TODO
	panic("à implémenter")
}

// Clone renvoie une copie profonde : aucun nœud n'est partagé avec l'original.
func Clone(root *Tree) *Tree {
	// TODO
	panic("à implémenter")
}

// Equal indique si deux arbres ont exactement la même forme et les mêmes valeurs.
func Equal(a, b *Tree) bool {
	// TODO
	panic("à implémenter")
}
