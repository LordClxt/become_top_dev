package lab

import "errors"

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
	// TODO
	panic("à implémenter")
}
