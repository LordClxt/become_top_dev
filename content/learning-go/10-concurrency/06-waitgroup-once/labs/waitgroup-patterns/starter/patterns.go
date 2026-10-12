package lab

// Merge fusionne plusieurs channels en un seul : toute valeur lue sur un channel d'entrée est livrée sur la sortie
// (ordre d'arrivée, pas d'ordre garanti). La sortie est fermée une fois TOUTES les entrées épuisées.
// Sans argument, la sortie est fermée tout de suite. Utilise un WaitGroup et une goroutine moniteur.
func Merge(chs ...<-chan int) <-chan int {
	// TODO
	panic("à implémenter")
}

// ProcessAll applique f à chaque élément de in avec au plus `workers` goroutines simultanées
// et renvoie les résultats DANS L'ORDRE de in. workers <= 0 est traité comme 1.
func ProcessAll(in []int, workers int, f func(int) int) []int {
	// TODO
	panic("à implémenter")
}

// RunAllErr lance toutes les fonctions en parallèle, attend qu'elles aient TOUTES fini, puis renvoie
// l'erreur de la première fonction (dans l'ordre des arguments) qui a échoué, ou nil si aucune n'a échoué.
func RunAllErr(fns ...func() error) error {
	// TODO
	panic("à implémenter")
}

// Lazy renvoie une fonction qui appelle build au premier appel puis renvoie toujours la même valeur,
// même si plusieurs goroutines l'appellent en même temps (build n'est exécutée qu'une fois).
// Implémente-la avec sync.Once.
func Lazy[T any](build func() T) func() T {
	// TODO
	panic("à implémenter")
}
