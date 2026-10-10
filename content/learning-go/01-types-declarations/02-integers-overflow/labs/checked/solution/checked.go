package lab

import "errors"

// ErrDivisionByZero est renvoyée par Divide quand le diviseur vaut 0.
var ErrDivisionByZero = errors.New("division par zéro")

// AddInt8 additionne a et b. overflow vaut true si le vrai résultat ne tient pas dans un int8 ;
// sum contient alors la valeur « qui a fait le tour », exactement ce que calcule le processeur.
func AddInt8(a, b int8) (sum int8, overflow bool) {
	sum = a + b
	// Deux opérandes de même signe qui donnent un résultat de signe opposé : débordement.
	overflow = (a > 0 && b > 0 && sum < 0) || (a < 0 && b < 0 && sum >= 0)
	return sum, overflow
}

// MulUint8 multiplie a et b. overflow vaut true si le produit dépasse 255.
func MulUint8(a, b uint8) (product uint8, overflow bool) {
	product = a * b
	overflow = a != 0 && product/a != b
	return product, overflow
}

// SaturatingSubUint8 renvoie a - b, mais s'arrête à 0 au lieu de faire le tour vers 255.
func SaturatingSubUint8(a, b uint8) uint8 {
	if b >= a {
		return 0
	}
	return a - b
}

// Divide renvoie le quotient et le reste de a / b, avec la division de Go (tronquée vers zéro).
func Divide(a, b int) (quotient, remainder int, err error) {
	if b == 0 {
		return 0, 0, ErrDivisionByZero
	}
	return a / b, a % b, nil
}
