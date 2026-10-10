package lab

// Squares renvoie une nouvelle slice contenant le carré de chaque nombre.
// Elle ne fait qu'une seule allocation et ne modifie pas nums.
func Squares(nums []int) []int {
	out := make([]int, 0, len(nums))
	for _, n := range nums {
		out = append(out, n*n)
	}
	return out
}
