package lab

// Node est un maillon d'une liste simplement chaînée.
type Node struct {
	Value int
	Next  *Node
}

// List est une liste simplement chaînée. La liste vide a Head == nil et Len == 0.
// Toutes les fonctions acceptent une liste nil et la traitent comme une liste vide (sans paniquer).
type List struct {
	Head *Node
	Len  int
}

// NewList crée une liste contenant values dans cet ordre (le premier est en tête).
func NewList(values ...int) *List {
	// TODO
	panic("à implémenter")
}

// Push ajoute v en tête, en temps constant.
func Push(l *List, v int) {
	// TODO
	panic("à implémenter")
}

// Append ajoute v en queue.
func Append(l *List, v int) {
	// TODO
	panic("à implémenter")
}

// Pop retire et renvoie la valeur de tête. ok vaut false si la liste est vide.
func Pop(l *List) (value int, ok bool) {
	// TODO
	panic("à implémenter")
}

// Contains indique si v est dans la liste.
func Contains(l *List, v int) bool {
	// TODO
	panic("à implémenter")
}

// Remove retire la première occurrence de v. Il renvoie false si v est absent.
func Remove(l *List, v int) bool {
	// TODO
	panic("à implémenter")
}

// Reverse inverse la liste sur place, en changeant les liens : aucun maillon n'est créé ni copié.
func Reverse(l *List) {
	// TODO
	panic("à implémenter")
}

// ToSlice renvoie les valeurs de la liste, de la tête à la queue.
func ToSlice(l *List) []int {
	// TODO
	panic("à implémenter")
}

// InsertSorted insère v dans une liste triée par ordre croissant, en gardant l'ordre.
// Avec des valeurs égales, v est placé après elles.
func InsertSorted(l *List, v int) {
	// TODO
	panic("à implémenter")
}
