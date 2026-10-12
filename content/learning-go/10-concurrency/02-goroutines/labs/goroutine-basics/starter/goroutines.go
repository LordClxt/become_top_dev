package lab

// RunAll lance chaque fonction dans sa propre goroutine et ne rend la main qu'après la fin de TOUTES.
// Les fonctions doivent vraiment s'exécuter de façon concurrente (l'une peut attendre l'autre).
// Sans argument, RunAll rend la main tout de suite.
func RunAll(fns ...func()) {
	// TODO
	panic("à implémenter")
}

// SquareAll renvoie le carré de chaque entier de nums, dans le même ordre, en calculant
// chaque carré dans sa propre goroutine. Chaque goroutine écrit dans sa propre case du résultat.
func SquareAll(nums []int) []int {
	// TODO
	panic("à implémenter")
}

// SumOfSquares renvoie la somme des carrés de nums en répartissant le travail entre `workers` goroutines,
// chacune traitant une tranche contiguë. workers <= 0 est traité comme 1 ; workers > len(nums) est ramené à len(nums).
// Une slice vide donne 0. Chaque goroutine écrit son sous-total dans sa propre case, puis l'appelant additionne.
func SumOfSquares(nums []int, workers int) int {
	// TODO
	panic("à implémenter")
}
