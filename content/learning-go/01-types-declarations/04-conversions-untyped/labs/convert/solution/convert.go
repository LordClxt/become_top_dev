package lab

import "math"

// Average renvoie la moyenne de xs, ou 0 si la slice est vide.
func Average(xs []int) float64 {
	if len(xs) == 0 {
		return 0
	}
	sum := 0
	for _, x := range xs {
		sum += x
	}
	return float64(sum) / float64(len(xs))
}

// Percent renvoie la part de part dans total, en pourcentage (0 si total vaut 0).
func Percent(part, total int) float64 {
	if total == 0 {
		return 0
	}
	return float64(part) / float64(total) * 100
}

// ClampToByte ramène n dans 0…255 au lieu de le laisser faire le tour.
func ClampToByte(n int) byte {
	switch {
	case n < 0:
		return 0
	case n > math.MaxUint8:
		return math.MaxUint8
	}
	return byte(n)
}

// NarrowToInt32 convertit n en int32. ok vaut false si n ne tient pas dans un int32.
func NarrowToInt32(n int64) (value int32, ok bool) {
	if n < math.MinInt32 || n > math.MaxInt32 {
		return 0, false
	}
	return int32(n), true
}

// RoundToInt arrondit f à l'entier le plus proche (les demi-valeurs s'éloignent de zéro).
func RoundToInt(f float64) int {
	return int(math.Round(f))
}
