package lab

// Chunk découpe ids en lots d'au plus n éléments.
// Faire append sur un lot ne doit modifier ni ids ni les autres lots.
func Chunk(ids []int, n int) [][]int {
	if n <= 0 {
		return nil
	}
	out := make([][]int, 0, (len(ids)+n-1)/n)
	for i := 0; i < len(ids); i += n {
		end := min(i+n, len(ids))
		// TODO: ce lot partage sa capacité avec la suite de ids.
		// Un append dessus écrase le lot suivant. Corrige-le.
		out = append(out, ids[i:end])
	}
	return out
}
