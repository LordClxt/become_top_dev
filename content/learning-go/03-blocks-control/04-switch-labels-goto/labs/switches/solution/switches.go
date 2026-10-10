package lab

import "fmt"

// Grade convertit une note sur 100 en lettre : A (90+), B (80+), C (70+), D (60+), F sinon.
// Une note hors de 0…100 donne « invalid ».
func Grade(score int) string {
	switch {
	case score < 0 || score > 100:
		return "invalid"
	case score >= 90:
		return "A"
	case score >= 80:
		return "B"
	case score >= 70:
		return "C"
	case score >= 60:
		return "D"
	}
	return "F"
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
	var pos Position
loop:
	for _, command := range commands {
		switch command {
		case "up", "north":
			pos.Y++
		case "down", "south":
			pos.Y--
		case "right", "east":
			pos.X++
		case "left", "west":
			pos.X--
		case "reset":
			pos = Position{}
		case "noop", "":
		case "stop":
			break loop
		default:
			return pos, fmt.Errorf("unknown command %q", command)
		}
	}
	return pos, nil
}

// FirstAllPositiveRow renvoie l'indice de la première ligne non vide dont toutes les valeurs sont strictement
// positives, ou -1 s'il n'y en a pas.
func FirstAllPositiveRow(grid [][]int) int {
outer:
	for i, row := range grid {
		if len(row) == 0 {
			continue
		}
		for _, v := range row {
			if v <= 0 {
				continue outer
			}
		}
		return i
	}
	return -1
}

// CountUntilNegative parcourt la grille ligne par ligne et compte les valeurs strictement positives,
// jusqu'à la première valeur négative (exclue) : le parcours s'arrête alors complètement. Les zéros sont ignorés.
func CountUntilNegative(grid [][]int) int {
	count := 0
outer:
	for _, row := range grid {
		for _, v := range row {
			switch {
			case v < 0:
				break outer
			case v > 0:
				count++
			}
		}
	}
	return count
}
