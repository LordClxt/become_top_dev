package lab

import (
	"slices"
	"strings"
)

// RuneAt est une rune et son décalage en octets dans la string d'origine.
type RuneAt struct {
	Offset int
	Rune   rune
}

// RuneOffsets décode s et renvoie chaque rune avec son décalage en octets.
func RuneOffsets(s string) []RuneAt {
	out := make([]RuneAt, 0, len(s))
	for offset, r := range s {
		out = append(out, RuneAt{Offset: offset, Rune: r})
	}
	return out
}

// FirstRepeat renvoie la première rune qui apparaît pour la deuxième fois, avec le décalage en octets
// de cette deuxième occurrence. ok vaut false si toutes les runes sont distinctes.
func FirstRepeat(s string) (r rune, offset int, ok bool) {
	seen := map[rune]bool{}
	for offset, r := range s {
		if seen[r] {
			return r, offset, true
		}
		seen[r] = true
	}
	return 0, 0, false
}

// DoubleAll double chaque élément de xs, en place.
func DoubleAll(xs []int) {
	for i := range xs {
		xs[i] *= 2
	}
}

// WordCount associe un mot à son nombre d'occurrences.
type WordCount struct {
	Word  string
	Count int
}

const punctuation = ".,;:!?\"'()[]"

// WordCounts compte les mots de text, sans tenir compte de la casse ni de la ponctuation aux extrémités des mots.
// Le résultat est trié par nombre d'occurrences décroissant, puis par ordre alphabétique : il est donc déterministe,
// alors que le parcours d'une map ne l'est pas.
func WordCounts(text string) []WordCount {
	counts := map[string]int{}
	for _, field := range strings.Fields(strings.ToLower(text)) {
		if word := strings.Trim(field, punctuation); word != "" {
			counts[word]++
		}
	}
	out := make([]WordCount, 0, len(counts))
	for word, count := range counts {
		out = append(out, WordCount{Word: word, Count: count})
	}
	slices.SortFunc(out, func(a, b WordCount) int {
		if a.Count != b.Count {
			return b.Count - a.Count
		}
		return strings.Compare(a.Word, b.Word)
	})
	return out
}
