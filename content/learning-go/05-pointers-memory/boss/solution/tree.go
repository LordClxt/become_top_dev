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
	switch {
	case root == nil:
		return &Tree{Value: v}
	case v < root.Value:
		root.Left = Insert(root.Left, v)
	case v > root.Value:
		root.Right = Insert(root.Right, v)
	}
	return root
}

// Contains indique si v est dans l'arbre.
func Contains(root *Tree, v int) bool {
	for root != nil {
		switch {
		case v < root.Value:
			root = root.Left
		case v > root.Value:
			root = root.Right
		default:
			return true
		}
	}
	return false
}

// Min renvoie la plus petite valeur. ok vaut false pour un arbre vide.
func Min(root *Tree) (v int, ok bool) {
	if root == nil {
		return 0, false
	}
	for root.Left != nil {
		root = root.Left
	}
	return root.Value, true
}

// Max renvoie la plus grande valeur. ok vaut false pour un arbre vide.
func Max(root *Tree) (v int, ok bool) {
	if root == nil {
		return 0, false
	}
	for root.Right != nil {
		root = root.Right
	}
	return root.Value, true
}

// Delete supprime v et renvoie la nouvelle racine. Un nœud à deux enfants est remplacé par son successeur
// (la plus petite valeur de son sous-arbre droit). Si v est absent, l'arbre est inchangé.
func Delete(root *Tree, v int) *Tree {
	if root == nil {
		return nil
	}
	switch {
	case v < root.Value:
		root.Left = Delete(root.Left, v)
	case v > root.Value:
		root.Right = Delete(root.Right, v)
	case root.Left == nil:
		return root.Right
	case root.Right == nil:
		return root.Left
	default:
		successor, _ := Min(root.Right)
		root.Value = successor
		root.Right = Delete(root.Right, successor)
	}
	return root
}

// Size renvoie le nombre de nœuds.
func Size(root *Tree) int {
	if root == nil {
		return 0
	}
	return 1 + Size(root.Left) + Size(root.Right)
}

// Height renvoie la hauteur : 0 pour un arbre vide, 1 pour un seul nœud.
func Height(root *Tree) int {
	if root == nil {
		return 0
	}
	return 1 + max(Height(root.Left), Height(root.Right))
}

// Walk visite les valeurs en ordre croissant et s'arrête dès que visit renvoie false.
func Walk(root *Tree, visit func(v int) bool) {
	walk(root, visit)
}

func walk(root *Tree, visit func(v int) bool) bool {
	if root == nil {
		return true
	}
	return walk(root.Left, visit) && visit(root.Value) && walk(root.Right, visit)
}

// InOrder renvoie les valeurs en ordre croissant.
func InOrder(root *Tree) []int {
	out := []int{}
	Walk(root, func(v int) bool {
		out = append(out, v)
		return true
	})
	return out
}

// FromSorted construit un arbre équilibré (hauteur minimale) à partir de valeurs triées par ordre
// strictement croissant. Les valeurs de la slice ne sont pas modifiées.
func FromSorted(values []int) *Tree {
	if len(values) == 0 {
		return nil
	}
	mid := len(values) / 2
	return &Tree{
		Value: values[mid],
		Left:  FromSorted(values[:mid]),
		Right: FromSorted(values[mid+1:]),
	}
}

// Clone renvoie une copie profonde : aucun nœud n'est partagé avec l'original.
func Clone(root *Tree) *Tree {
	if root == nil {
		return nil
	}
	return &Tree{Value: root.Value, Left: Clone(root.Left), Right: Clone(root.Right)}
}

// Equal indique si deux arbres ont exactement la même forme et les mêmes valeurs.
func Equal(a, b *Tree) bool {
	if a == nil || b == nil {
		return a == b
	}
	return a.Value == b.Value && Equal(a.Left, b.Left) && Equal(a.Right, b.Right)
}
