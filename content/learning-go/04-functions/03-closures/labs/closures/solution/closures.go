package lab

import (
	"slices"
	"sort"
)

// Counter renvoie une fonction qui, à chaque appel, renvoie start, puis start+1, puis start+2…
// Chaque appel de Counter crée un compteur indépendant.
func Counter(start int) func() int {
	next := start
	return func() int {
		current := next
		next++
		return current
	}
}

// Prefixer renvoie une fonction qui ajoute prefix devant son argument.
func Prefixer(prefix string) func(string) string {
	return func(s string) string {
		return prefix + s
	}
}

// Memoize renvoie une version de f qui retient ses résultats : f n'est appelée qu'une fois par argument.
// Le cache appartient à la fonction renvoyée, pas au package.
func Memoize(f func(int) int) func(int) int {
	cache := map[int]int{}
	return func(n int) int {
		if result, ok := cache[n]; ok { // comma ok : un résultat 0 est un vrai résultat
			return result
		}
		result := f(n)
		cache[n] = result
		return result
	}
}

// Chain renvoie une fonction qui applique fns dans l'ordre. Sans fonction, elle renvoie son argument.
// Chain doit rester correcte même si l'appelant modifie sa slice fns après coup.
func Chain(fns ...func(string) string) func(string) string {
	fns = slices.Clone(fns) // sinon la closure partage la slice de l'appelant
	return func(s string) string {
		for _, fn := range fns {
			s = fn(s)
		}
		return s
	}
}

// Person est une personne à trier.
type Person struct {
	FirstName string
	LastName  string
	Age       int
}

// SortPeople trie people sur place selon less. Le tri est stable : deux personnes « égales » gardent leur ordre.
func SortPeople(people []Person, less func(a, b Person) bool) {
	sort.SliceStable(people, func(i, j int) bool {
		return less(people[i], people[j])
	})
}
