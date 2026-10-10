package lab

// Grade convertit une note sur 100 en lettre : A (90+), B (80+), C (70+), D (60+), F sinon.
// Une note hors de 0…100 donne « invalid ».
func Grade(score int) string {
	// TODO : un switch sans expression
	panic("à implémenter")
}

// Position est une case sur une grille.
type Position struct{ X, Y int }

// Run exécute des ordres de déplacement, dans l'ordre, et renvoie la position finale.
//
//	up, north      Y+1        down, south    Y-1
//	right, east    X+1        left, west     X-1
//	reset          retour à {0, 0}
//	noop, ""       ne fait rien
//	stop           arrête tout : les ordres suivants sont ignorés
//
// Un ordre inconnu arrête l'exécution et renvoie la position atteinte avec une erreur « unknown command "…" ».
func Run(commands []string) (Position, error) {
	// TODO : un switch dans un for, avec un label pour « stop »
	panic("à implémenter")
}

// FirstAllPositiveRow renvoie l'indice de la première ligne non vide dont toutes les valeurs sont strictement
// positives, ou -1 s'il n'y en a pas.
func FirstAllPositiveRow(grid [][]int) int {
	// TODO : continue avec un label
	panic("à implémenter")
}

// CountUntilNegative parcourt la grille ligne par ligne et compte les valeurs strictement positives,
// jusqu'à la première valeur négative (exclue) : le parcours s'arrête alors complètement. Les zéros sont ignorés.
func CountUntilNegative(grid [][]int) int {
	// TODO : break avec un label
	panic("à implémenter")
}
