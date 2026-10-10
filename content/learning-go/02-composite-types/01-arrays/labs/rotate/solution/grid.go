package lab

// Grid est une grille de jeu de taille fixe 3×3.
type Grid [3][3]int

// RotateClockwise renvoie une nouvelle grille tournée d'un quart de tour
// dans le sens des aiguilles d'une montre. La grille reçue n'est pas modifiée.
func RotateClockwise(g Grid) Grid {
	var out Grid
	for r := 0; r < 3; r++ {
		for c := 0; c < 3; c++ {
			out[c][2-r] = g[r][c]
		}
	}
	return out
}
