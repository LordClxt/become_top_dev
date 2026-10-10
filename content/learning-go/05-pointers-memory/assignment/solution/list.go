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
	l := &List{}
	for i := len(values) - 1; i >= 0; i-- {
		Push(l, values[i])
	}
	return l
}

// Push ajoute v en tête, en temps constant.
func Push(l *List, v int) {
	if l == nil {
		return
	}
	l.Head = &Node{Value: v, Next: l.Head}
	l.Len++
}

// Append ajoute v en queue.
func Append(l *List, v int) {
	if l == nil {
		return
	}
	link := &l.Head // l'adresse du pointeur à remplir : l.Head, puis le champ Next du dernier maillon
	for *link != nil {
		link = &(*link).Next
	}
	*link = &Node{Value: v}
	l.Len++
}

// Pop retire et renvoie la valeur de tête. ok vaut false si la liste est vide.
func Pop(l *List) (value int, ok bool) {
	if l == nil || l.Head == nil {
		return 0, false
	}
	first := l.Head
	l.Head = first.Next
	first.Next = nil // ne retient pas le reste de la liste
	l.Len--
	return first.Value, true
}

// Contains indique si v est dans la liste.
func Contains(l *List, v int) bool {
	if l == nil {
		return false
	}
	for n := l.Head; n != nil; n = n.Next {
		if n.Value == v {
			return true
		}
	}
	return false
}

// Remove retire la première occurrence de v. Il renvoie false si v est absent.
func Remove(l *List, v int) bool {
	if l == nil {
		return false
	}
	for link := &l.Head; *link != nil; link = &(*link).Next {
		if (*link).Value == v {
			removed := *link
			*link = removed.Next // le pointeur précédent (ou Head) saute le maillon
			removed.Next = nil
			l.Len--
			return true
		}
	}
	return false
}

// Reverse inverse la liste sur place, en changeant les liens : aucun maillon n'est créé ni copié.
func Reverse(l *List) {
	if l == nil {
		return
	}
	var previous *Node
	for current := l.Head; current != nil; {
		next := current.Next
		current.Next = previous
		previous, current = current, next
	}
	l.Head = previous
}

// ToSlice renvoie les valeurs de la liste, de la tête à la queue.
func ToSlice(l *List) []int {
	out := []int{}
	if l == nil {
		return out
	}
	for n := l.Head; n != nil; n = n.Next {
		out = append(out, n.Value)
	}
	return out
}

// InsertSorted insère v dans une liste triée par ordre croissant, en gardant l'ordre.
// Avec des valeurs égales, v est placé après elles.
func InsertSorted(l *List, v int) {
	if l == nil {
		return
	}
	link := &l.Head
	for *link != nil && (*link).Value <= v {
		link = &(*link).Next
	}
	*link = &Node{Value: v, Next: *link}
	l.Len++
}
