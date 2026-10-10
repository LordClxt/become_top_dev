package lab

// Ptr renvoie un pointeur vers une copie de v. Chaque appel renvoie un pointeur distinct.
func Ptr[T any](v T) *T {
	// TODO
	panic("à implémenter")
}

// Deref renvoie la valeur pointée par p, ou fallback si p est nil.
// Attention : un pointeur vers la valeur zéro n'est pas un pointeur absent.
func Deref[T any](p *T, fallback T) T {
	// TODO
	panic("à implémenter")
}

// Swap échange les valeurs pointées par a et b. Si l'un des deux est nil, ne fait rien.
func Swap(a, b *int) {
	// TODO
	panic("à implémenter")
}

// IncrementAll ajoute 1 à chaque entier pointé. Les pointeurs nil sont ignorés.
func IncrementAll(counters ...*int) {
	// TODO
	panic("à implémenter")
}

// Largest renvoie un pointeur vers le plus grand élément de xs, c'est-à-dire vers la case elle-même dans xs
// (pas vers une copie). En cas d'égalité, c'est la première. Il renvoie nil si xs est vide.
func Largest(xs []int) *int {
	// TODO
	panic("à implémenter")
}

// Person a un deuxième prénom optionnel : nil signifie « pas de deuxième prénom ».
type Person struct {
	FirstName  string
	MiddleName *string
	LastName   string
}

// FullName assemble prénom, deuxième prénom (s'il existe et n'est pas vide) et nom, séparés par un espace.
func FullName(p Person) string {
	// TODO
	panic("à implémenter")
}
