package lab

// RuneAt est une rune et son décalage en octets dans la string d'origine.
type RuneAt struct {
	Offset int
	Rune   rune
}

// RuneOffsets décode s et renvoie chaque rune avec son décalage en octets.
func RuneOffsets(s string) []RuneAt {
	// TODO
	panic("à implémenter")
}

// FirstRepeat renvoie la première rune qui apparaît pour la deuxième fois, avec le décalage en octets
// de cette deuxième occurrence. ok vaut false si toutes les runes sont distinctes.
func FirstRepeat(s string) (r rune, offset int, ok bool) {
	// TODO
	panic("à implémenter")
}

// DoubleAll double chaque élément de xs, en place.
func DoubleAll(xs []int) {
	// TODO
	panic("à implémenter")
}

// WordCount associe un mot à son nombre d'occurrences.
type WordCount struct {
	Word  string
	Count int
}

// WordCounts compte les mots de text, sans tenir compte de la casse ni de la ponctuation aux extrémités des mots.
// Le résultat est trié par nombre d'occurrences décroissant, puis par ordre alphabétique : il est donc déterministe,
// alors que le parcours d'une map ne l'est pas.
func WordCounts(text string) []WordCount {
	// TODO
	panic("à implémenter")
}
