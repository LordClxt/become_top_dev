package lab

import (
	"errors"
	"fmt"
	"math"
)

// Approx indique si a et b sont égaux à epsilon près.
func Approx(a, b, epsilon float64) bool {
	if a == b { // couvre +Inf == +Inf et -Inf == -Inf
		return true
	}
	if math.IsNaN(a) || math.IsNaN(b) || math.IsInf(a, 0) || math.IsInf(b, 0) {
		return false
	}
	return math.Abs(a-b) <= epsilon
}

// ParseCents lit un montant décimal comme « 12.34 » et renvoie des centimes, sans jamais utiliser de flottant.
func ParseCents(s string) (int64, error) {
	original := s
	negative := false
	if len(s) > 0 && s[0] == '-' {
		negative, s = true, s[1:]
	}

	intPart, frac := s, ""
	hasDot := false
	for i := 0; i < len(s); i++ {
		if s[i] == '.' {
			intPart, frac, hasDot = s[:i], s[i+1:], true
			break
		}
	}
	if intPart == "" || (hasDot && (frac == "" || len(frac) > 2)) {
		return 0, fmt.Errorf("%q : format attendu 12 ou 12.34", original)
	}
	if !allDigits(intPart) || !allDigits(frac) {
		return 0, fmt.Errorf("%q : seuls les chiffres sont autorisés", original)
	}

	var fracCents int64
	switch len(frac) {
	case 1:
		fracCents = int64(frac[0]-'0') * 10
	case 2:
		fracCents = int64(frac[0]-'0')*10 + int64(frac[1]-'0')
	}

	var whole int64
	for i := 0; i < len(intPart); i++ {
		d := int64(intPart[i] - '0')
		if whole > (math.MaxInt64-d)/10 {
			return 0, errors.New("montant trop grand")
		}
		whole = whole*10 + d
	}
	if whole > (math.MaxInt64-fracCents)/100 {
		return 0, errors.New("montant trop grand")
	}
	cents := whole*100 + fracCents
	if negative {
		cents = -cents
	}
	return cents, nil
}

func allDigits(s string) bool {
	for i := 0; i < len(s); i++ {
		if s[i] < '0' || s[i] > '9' {
			return false
		}
	}
	return true
}

// FormatCents affiche des centimes sous la forme « 12.34 ».
func FormatCents(cents int64) string {
	sign := ""
	abs := uint64(cents)
	if cents < 0 {
		sign = "-"
		abs = uint64(-(cents + 1)) + 1 // correct même pour le plus petit int64
	}
	return fmt.Sprintf("%s%d.%02d", sign, abs/100, abs%100)
}

// SplitBill répartit total centimes entre n personnes sans en perdre un seul :
// les premières personnes paient un centime de plus quand la division ne tombe pas juste.
func SplitBill(total int64, n int) []int64 {
	if n <= 0 || total < 0 {
		return nil
	}
	base, extra := total/int64(n), total%int64(n)
	shares := make([]int64, n)
	for i := range shares {
		shares[i] = base
		if int64(i) < extra {
			shares[i]++
		}
	}
	return shares
}
