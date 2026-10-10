package lab

// Person est une personne.
type Person struct {
	Name string
	Age  int
}

// Birthday renvoie une copie de p, un an plus âgée. p n'est pas modifiée (une struct est passée par valeur).
func Birthday(p Person) Person {
	// TODO
	panic("à implémenter")
}

// Clamp ramène chaque score de la map dans 0…100, sur place. Une map est partagée avec l'appelant.
func Clamp(scores map[string]int) {
	// TODO
	panic("à implémenter")
}

// Without renvoie une nouvelle slice sans l'élément d'indice i. La slice de l'appelant n'est jamais modifiée.
// Si i est hors de s, le résultat est une copie de s.
func Without(s []int, i int) []int {
	// TODO
	panic("à implémenter")
}

// Reverse inverse s sur place. Les éléments d'une slice sont partagés avec l'appelant.
func Reverse(s []int) {
	// TODO
	panic("à implémenter")
}

// Resize renvoie une nouvelle slice de longueur exactement n : tronquée, ou complétée par des zéros.
// s n'est pas modifiée et le résultat ne partage aucun élément avec elle. n négatif donne une slice vide.
func Resize(s []int, n int) []int {
	// TODO
	panic("à implémenter")
}
