package lab

// Squares renvoie une nouvelle slice contenant le carré de chaque nombre.
// Elle ne fait qu'une seule allocation et ne modifie pas nums.
func Squares(nums []int) []int {
	var out []int
	// TODO: cette version grandit élément par élément et réalloue plusieurs fois.
	// Corrige-la pour qu'elle réserve la bonne taille dès le départ.
	for _, n := range nums {
		out = append(out, n)
	}
	return out
}
