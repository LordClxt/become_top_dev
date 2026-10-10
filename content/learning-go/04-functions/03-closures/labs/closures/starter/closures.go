package lab

// Counter renvoie une fonction qui, à chaque appel, renvoie start, puis start+1, puis start+2…
// Chaque appel de Counter crée un compteur indépendant.
func Counter(start int) func() int {
	// TODO
	panic("à implémenter")
}

// Prefixer renvoie une fonction qui ajoute prefix devant son argument.
func Prefixer(prefix string) func(string) string {
	// TODO
	panic("à implémenter")
}

// Memoize renvoie une version de f qui retient ses résultats : f n'est appelée qu'une fois par argument.
// Le cache appartient à la fonction renvoyée, pas au package.
func Memoize(f func(int) int) func(int) int {
	// TODO
	panic("à implémenter")
}

// Chain renvoie une fonction qui applique fns dans l'ordre. Sans fonction, elle renvoie son argument.
// Chain doit rester correcte même si l'appelant modifie sa slice fns après coup.
func Chain(fns ...func(string) string) func(string) string {
	// TODO
	panic("à implémenter")
}

// Person est une personne à trier.
type Person struct {
	FirstName string
	LastName  string
	Age       int
}

// SortPeople trie people sur place selon less. Le tri est stable : deux personnes « égales » gardent leur ordre.
func SortPeople(people []Person, less func(a, b Person) bool) {
	// TODO : une closure qui compare people[i] et people[j] grâce à less
	panic("à implémenter")
}
