package lab

import (
	"errors"
	"fmt"
)

// TapeSize est le nombre de cases de la bande.
const TapeSize = 30000

var (
	ErrUnbalanced = errors.New("crochets non appariés")
	ErrPointer    = errors.New("pointeur hors de la bande")
	ErrSteps      = errors.New("limite d'étapes dépassée")
)

// Run exécute un programme Brainfuck et renvoie ce qu'il a écrit.
//
//	>  <   déplacent le pointeur de la bande d'une case           +  -   ajoutent ou retirent 1 à la case (sur 8 bits, avec retour)
//	.      écrit la case en sortie                                 ,      lit un octet de input dans la case (0 quand input est épuisé)
//	[      saute après le ] correspondant si la case vaut 0        ]      revient après le [ correspondant si la case ne vaut pas 0
//
// Tout autre caractère est un commentaire. Les crochets sont vérifiés avant l'exécution.
// Chaque instruction exécutée (crochets compris) compte pour une étape ; la (maxSteps+1)-ième déclenche ErrSteps.
// En cas d'erreur d'exécution, la sortie produite jusque-là est renvoyée.
func Run(program string, input []byte, maxSteps int) ([]byte, error) {
	jumps, err := matchBrackets(program)
	if err != nil {
		return nil, err
	}

	var (
		tape   [TapeSize]byte
		ptr    int
		inPos  int
		output []byte
		steps  int
	)
	for pc := 0; pc < len(program); pc++ {
		command := program[pc]
		switch command {
		case '>', '<', '+', '-', '.', ',', '[', ']':
		default:
			continue // commentaire
		}

		steps++
		if steps > maxSteps {
			return output, ErrSteps
		}

		switch command {
		case '>':
			if ptr++; ptr >= TapeSize {
				return output, fmt.Errorf("%w : case %d", ErrPointer, ptr)
			}
		case '<':
			if ptr--; ptr < 0 {
				return output, fmt.Errorf("%w : case %d", ErrPointer, ptr)
			}
		case '+':
			tape[ptr]++
		case '-':
			tape[ptr]--
		case '.':
			output = append(output, tape[ptr])
		case ',':
			if inPos < len(input) {
				tape[ptr] = input[inPos]
				inPos++
			} else {
				tape[ptr] = 0
			}
		case '[':
			if tape[ptr] == 0 {
				pc = jumps[pc]
			}
		case ']':
			if tape[ptr] != 0 {
				pc = jumps[pc]
			}
		}
	}
	return output, nil
}

// matchBrackets associe chaque crochet à son correspondant.
func matchBrackets(program string) (map[int]int, error) {
	jumps := map[int]int{}
	var open []int
	for i := 0; i < len(program); i++ {
		switch program[i] {
		case '[':
			open = append(open, i)
		case ']':
			if len(open) == 0 {
				return nil, fmt.Errorf("%w : ] sans [ à la position %d", ErrUnbalanced, i)
			}
			start := open[len(open)-1]
			open = open[:len(open)-1]
			jumps[start], jumps[i] = i, start
		}
	}
	if len(open) > 0 {
		return nil, fmt.Errorf("%w : [ sans ] à la position %d", ErrUnbalanced, open[len(open)-1])
	}
	return jumps, nil
}
