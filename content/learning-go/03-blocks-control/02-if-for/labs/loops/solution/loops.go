package lab

import "strconv"

// Rule associe un mot à un diviseur.
type Rule struct {
	Divisor int
	Word    string
}

// FizzBuzz renvoie, pour i de 1 à n, les mots des règles dont le diviseur divise i, collés dans l'ordre des règles,
// ou i en décimal quand aucune règle ne s'applique. Les règles de diviseur <= 0 sont ignorées.
func FizzBuzz(n int, rules []Rule) []string {
	out := make([]string, 0, max(n, 0))
	for i := 1; i <= n; i++ {
		word := ""
		for _, r := range rules {
			if r.Divisor > 0 && i%r.Divisor == 0 {
				word += r.Word
			}
		}
		if word == "" {
			word = strconv.Itoa(i)
		}
		out = append(out, word)
	}
	return out
}

// Collatz renvoie le nombre d'étapes pour atteindre 1 : n pair → n/2, n impair → 3n+1.
// Elle renvoie -1 si n <= 0.
func Collatz(n int) int {
	if n <= 0 {
		return -1
	}
	steps := 0
	for n != 1 {
		if n%2 == 0 {
			n /= 2
		} else {
			n = 3*n + 1
		}
		steps++
	}
	return steps
}

// ReadUntil renvoie les jetons qui précèdent la sentinelle stop (exclue).
// found vaut false si la sentinelle n'apparaît pas : taken contient alors tous les jetons.
func ReadUntil(tokens []string, stop string) (taken []string, found bool) {
	i := 0
	for {
		if i == len(tokens) {
			return tokens, false
		}
		if tokens[i] == stop {
			return tokens[:i], true
		}
		i++
	}
}

// SumEveryNth additionne xs[start], xs[start+step], xs[start+2*step]…
// Elle renvoie 0 si step <= 0 ou si start est hors de xs.
func SumEveryNth(xs []int, start, step int) int {
	if step <= 0 || start < 0 {
		return 0
	}
	sum := 0
	for i := start; i < len(xs); i += step {
		sum += xs[i]
	}
	return sum
}
