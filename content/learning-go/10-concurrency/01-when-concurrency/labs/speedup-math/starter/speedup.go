package lab

import "math"

// Speedup renvoie le gain d'Amdahl pour une fraction parallélisable p (0 ≤ p ≤ 1) exécutée sur n cœurs (n ≥ 1) :
// 1 / ((1 - p) + p/n).
func Speedup(p float64, n int) float64 {
	// TODO
	panic("à implémenter")
}

// MaxSpeedup renvoie la limite du gain quand le nombre de cœurs tend vers l'infini : 1 / (1 - p).
// Pour p == 1 le gain n'est pas borné : renvoie +Inf.
func MaxSpeedup(p float64) float64 {
	// TODO
	_ = math.Inf
	panic("à implémenter")
}

// CoresFor renvoie le plus petit nombre de cœurs qui atteint au moins le gain target.
// Si target <= 1, un cœur suffit. Si le plafond MaxSpeedup(p) est inférieur ou égal à target, c'est inatteignable : (0, false).
func CoresFor(p, target float64) (cores int, ok bool) {
	// TODO
	panic("à implémenter")
}

// Chunks découpe n éléments en `parts` tranches contiguës [début, fin) de tailles presque égales :
// les premières tranches reçoivent un élément de plus quand n n'est pas divisible par parts.
// Si parts > n, on ne renvoie que n tranches (jamais de tranche vide). Si n <= 0 ou parts <= 0, renvoie nil.
func Chunks(n, parts int) [][2]int {
	// TODO
	panic("à implémenter")
}
