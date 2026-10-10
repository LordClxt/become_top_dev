package lab

import (
	"cmp"
	"slices"
	"strings"
	"unicode"
	"unicode/utf8"
)

// WordCount associe un mot à son nombre d'occurrences.
type WordCount struct {
	Word  string
	Count int
}

// Report résume un texte.
type Report struct {
	Words       int
	UniqueWords int
	Top         []WordCount
	Longest     string
}

// Analyze construit le rapport d'un texte. Voir instructions.md pour les règles.
func Analyze(text string, top int) Report {
	words := strings.FieldsFunc(strings.ToLower(text), func(r rune) bool {
		return !unicode.IsLetter(r)
	})

	counts := make(map[string]int, len(words))
	var longest string
	for _, w := range words {
		counts[w]++
		if utf8.RuneCountInString(w) > utf8.RuneCountInString(longest) {
			longest = w
		}
	}

	return Report{
		Words:       len(words),
		UniqueWords: len(counts),
		Top:         topWords(counts, top),
		Longest:     longest,
	}
}

// topWords renvoie au plus n mots, du plus fréquent au moins fréquent,
// puis par ordre alphabétique en cas d'égalité.
func topWords(counts map[string]int, n int) []WordCount {
	all := make([]WordCount, 0, len(counts))
	for w, c := range counts {
		all = append(all, WordCount{Word: w, Count: c})
	}
	slices.SortFunc(all, func(a, b WordCount) int {
		if c := cmp.Compare(b.Count, a.Count); c != 0 {
			return c
		}
		return strings.Compare(a.Word, b.Word)
	})
	return all[:min(max(n, 0), len(all))]
}
