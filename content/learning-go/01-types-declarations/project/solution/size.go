package lab

import (
	"errors"
	"fmt"
	"math"
	"strconv"
	"strings"
)

var (
	ErrFormat   = errors.New("format invalide")
	ErrUnit     = errors.New("unité inconnue")
	ErrFraction = errors.New("la taille n'est pas un nombre entier d'octets")
	ErrTooLarge = errors.New("taille trop grande")
)

var units = map[string]int64{
	"": 1, "B": 1,
	"KB": 1_000, "MB": 1_000_000, "GB": 1_000_000_000,
	"KiB": 1 << 10, "MiB": 1 << 20, "GiB": 1 << 30,
}

// ParseSize lit une taille comme « 512 », « 10KB » ou « 1.5MiB » et renvoie un nombre d'octets.
// Le calcul se fait en entiers : aucun flottant n'intervient.
func ParseSize(s string) (int64, error) {
	end := 0
	for end < len(s) && (s[end] == '.' || (s[end] >= '0' && s[end] <= '9')) {
		end++
	}
	number, unitName := s[:end], s[end:]

	whole, frac, hasDot := number, "", false
	if i := strings.IndexByte(number, '.'); i >= 0 {
		whole, frac, hasDot = number[:i], number[i+1:], true
	}
	if whole == "" || (hasDot && (frac == "" || strings.Contains(frac, "."))) {
		return 0, fmt.Errorf("%w : %q", ErrFormat, s)
	}
	unit, ok := units[unitName]
	if !ok {
		return 0, fmt.Errorf("%w : %q", ErrUnit, unitName)
	}
	if len(frac) > 9 {
		return 0, fmt.Errorf("%w : trop de décimales dans %q", ErrFraction, s)
	}

	wholeValue, err := strconv.ParseInt(whole, 10, 64)
	if err != nil {
		return 0, fmt.Errorf("%w : %q", ErrTooLarge, s)
	}
	var fracBytes int64
	if frac != "" {
		fracValue, _ := strconv.ParseInt(frac, 10, 64)
		denominator := int64(math.Pow10(len(frac)))
		scaled := fracValue * unit // < 10^9 * 2^30 : tient dans un int64
		if scaled%denominator != 0 {
			return 0, fmt.Errorf("%w : %q", ErrFraction, s)
		}
		fracBytes = scaled / denominator
	}
	if wholeValue > (math.MaxInt64-fracBytes)/unit {
		return 0, fmt.Errorf("%w : %q", ErrTooLarge, s)
	}
	return wholeValue*unit + fracBytes, nil
}

var binaryUnits = []string{"B", "KiB", "MiB", "GiB", "TiB", "PiB", "EiB"}

// FormatSize affiche n octets avec l'unité binaire la plus grande possible et une décimale tronquée.
func FormatSize(n int64) string {
	sign := ""
	abs := uint64(n)
	if n < 0 {
		sign = "-"
		abs = uint64(-(n + 1)) + 1
	}
	if abs < 1024 {
		return fmt.Sprintf("%s%d B", sign, abs)
	}
	level, scale := 0, uint64(1)
	for level < len(binaryUnits)-1 && abs/scale >= 1024 {
		level++
		scale <<= 10
	}
	whole := abs / scale
	tenths := (abs % scale) * 10 / scale
	return fmt.Sprintf("%s%d.%d %s", sign, whole, tenths, binaryUnits[level])
}

// Percent renvoie la part de used dans limit, en pourcentage (0 si limit n'est pas strictement positif).
func Percent(used, limit int64) float64 {
	if limit <= 0 {
		return 0
	}
	return float64(used) * 100 / float64(limit)
}

// Level classe l'usage : « unlimited » (limit <= 0), « ok » (< 80 %), « warn » (de 80 % à moins de 100 %), « full ».
// La comparaison se fait en entiers : au-delà de 2^53, un float64 ne distingue plus deux int64 voisins.
func Level(used, limit int64) string {
	switch {
	case limit <= 0:
		return "unlimited"
	case used >= limit:
		return "full"
	case used >= limit-limit/5: // 80 % de limit, arrondi vers le haut, sans multiplication qui déborde
		return "warn"
	}
	return "ok"
}
