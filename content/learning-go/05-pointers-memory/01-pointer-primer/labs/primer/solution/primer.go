package lab

import "strings"

// Ptr renvoie un pointeur vers une copie de v. Chaque appel renvoie un pointeur distinct.
func Ptr[T any](v T) *T {
	return &v
}

// Deref renvoie la valeur pointée par p, ou fallback si p est nil.
// Attention : un pointeur vers la valeur zéro n'est pas un pointeur absent.
func Deref[T any](p *T, fallback T) T {
	if p == nil {
		return fallback
	}
	return *p
}

// Swap échange les valeurs pointées par a et b. Si l'un des deux est nil, ne fait rien.
func Swap(a, b *int) {
	if a == nil || b == nil {
		return
	}
	*a, *b = *b, *a
}

// IncrementAll ajoute 1 à chaque entier pointé. Les pointeurs nil sont ignorés.
func IncrementAll(counters ...*int) {
	for _, c := range counters {
		if c != nil {
			*c++
		}
	}
}

// Largest renvoie un pointeur vers le plus grand élément de xs, c'est-à-dire vers la case elle-même dans xs
// (pas vers une copie). En cas d'égalité, c'est la première. Il renvoie nil si xs est vide.
func Largest(xs []int) *int {
	if len(xs) == 0 {
		return nil
	}
	best := 0
	for i := range xs {
		if xs[i] > xs[best] {
			best = i
		}
	}
	return &xs[best]
}

// Person a un deuxième prénom optionnel : nil signifie « pas de deuxième prénom ».
type Person struct {
	FirstName  string
	MiddleName *string
	LastName   string
}

// FullName assemble prénom, deuxième prénom (s'il existe et n'est pas vide) et nom, séparés par un espace.
func FullName(p Person) string {
	parts := []string{p.FirstName}
	if p.MiddleName != nil && strings.TrimSpace(*p.MiddleName) != "" {
		parts = append(parts, *p.MiddleName)
	}
	parts = append(parts, p.LastName)
	return strings.Join(parts, " ")
}
