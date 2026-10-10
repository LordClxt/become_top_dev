package lab

// Rule associe un mot à un diviseur.
type Rule struct {
	Divisor int
	Word    string
}

// FizzBuzz renvoie, pour i de 1 à n, les mots des règles dont le diviseur divise i, collés dans l'ordre des règles,
// ou i en décimal quand aucune règle ne s'applique. Les règles de diviseur <= 0 sont ignorées.
func FizzBuzz(n int, rules []Rule) []string {
	// TODO
	panic("à implémenter")
}

// Collatz renvoie le nombre d'étapes pour atteindre 1 : n pair → n/2, n impair → 3n+1.
// Elle renvoie -1 si n <= 0.
func Collatz(n int) int {
	// TODO : une boucle « condition seule »
	panic("à implémenter")
}

// ReadUntil renvoie les jetons qui précèdent la sentinelle stop (exclue).
// found vaut false si la sentinelle n'apparaît pas : taken contient alors tous les jetons.
func ReadUntil(tokens []string, stop string) (taken []string, found bool) {
	// TODO : une boucle infinie qui se termine par break ou return
	panic("à implémenter")
}

// SumEveryNth additionne xs[start], xs[start+step], xs[start+2*step]…
// Elle renvoie 0 si step <= 0 ou si start est hors de xs.
func SumEveryNth(xs []int, start, step int) int {
	// TODO : une boucle for complète avec un incrément personnalisé
	panic("à implémenter")
}
