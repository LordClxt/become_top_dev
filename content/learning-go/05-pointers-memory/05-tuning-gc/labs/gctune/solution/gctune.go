package lab

import (
	"errors"
	"fmt"
	"math"
	"math/bits"
	"strconv"
)

const (
	// GOGCOff représente GOGC=off.
	GOGCOff = -1
	// NoLimit est la valeur de GOMEMLIMIT quand aucune limite n'est fixée.
	NoLimit uint64 = math.MaxInt64
)

// GCSettings regroupe les deux réglages du ramasse-miettes.
type GCSettings struct {
	GOGC     int    // pourcentage ; GOGCOff si le GC est désactivé
	MemLimit uint64 // en octets ; NoLimit si aucune limite
}

// NextGCTarget renvoie la taille du tas qui déclenche le prochain cycle : heap + heap×gogc/100.
// Si gogc est négatif (GC désactivé), il n'y a pas de déclenchement : math.MaxUint64.
// Le résultat sature à math.MaxUint64 au lieu de déborder.
func NextGCTarget(heap uint64, gogc int) uint64 {
	if gogc < 0 {
		return math.MaxUint64
	}
	hi, lo := bits.Mul64(heap, uint64(gogc)) // produit exact sur 128 bits
	if hi >= 100 {
		return math.MaxUint64 // le quotient ne tiendrait pas sur 64 bits
	}
	growth, _ := bits.Div64(hi, lo, 100)
	sum, carry := bits.Add64(heap, growth, 0)
	if carry != 0 {
		return math.MaxUint64
	}
	return sum
}

var memUnits = map[string]uint64{"": 1, "B": 1, "KiB": 1 << 10, "MiB": 1 << 20, "GiB": 1 << 30, "TiB": 1 << 40}

// ParseMemLimit lit une valeur de GOMEMLIMIT : des chiffres suivis d'un suffixe facultatif
// (B, KiB, MiB, GiB ou TiB, en respectant la casse).
func ParseMemLimit(s string) (uint64, error) {
	end := 0
	for end < len(s) && s[end] >= '0' && s[end] <= '9' {
		end++
	}
	digits, suffix := s[:end], s[end:]
	if digits == "" {
		return 0, fmt.Errorf("limite %q : un nombre est attendu", s)
	}
	unit, ok := memUnits[suffix]
	if !ok {
		return 0, fmt.Errorf("limite %q : suffixe %q inconnu (B, KiB, MiB, GiB, TiB)", s, suffix)
	}
	n, err := strconv.ParseUint(digits, 10, 64)
	if err != nil {
		return 0, fmt.Errorf("limite %q : %w", s, err)
	}
	hi, lo := bits.Mul64(n, unit)
	if hi != 0 {
		return 0, fmt.Errorf("limite %q : dépasse 64 bits", s)
	}
	return lo, nil
}

// ReadGCSettings lit GOGC et GOMEMLIMIT dans env.
// GOGC absent ou vide vaut 100 ; « off » désactive le GC ; sinon un entier >= 0.
// GOMEMLIMIT absent ou vide vaut NoLimit ; sinon voir ParseMemLimit.
func ReadGCSettings(env map[string]string) (GCSettings, error) {
	settings := GCSettings{GOGC: 100, MemLimit: NoLimit}

	switch value := env["GOGC"]; {
	case value == "":
	case value == "off":
		settings.GOGC = GOGCOff
	default:
		n, err := strconv.Atoi(value)
		if err != nil || n < 0 {
			return GCSettings{}, fmt.Errorf("GOGC : %q n'est ni « off » ni un entier positif", value)
		}
		settings.GOGC = n
	}

	if value := env["GOMEMLIMIT"]; value != "" {
		limit, err := ParseMemLimit(value)
		if err != nil {
			return GCSettings{}, fmt.Errorf("GOMEMLIMIT : %w", err)
		}
		settings.MemLimit = limit
	}
	return settings, nil
}

// EffectiveTarget renvoie la taille de tas qui déclenchera réellement le prochain cycle :
// le déclenchement de GOGC, ramené à la limite mémoire si elle est plus basse.
func EffectiveTarget(heap uint64, s GCSettings) uint64 {
	return min(NextGCTarget(heap, s.GOGC), s.MemLimit)
}

// ErrInvalidLimit est renvoyée par CheckLimit quand la limite est nulle.
var ErrInvalidLimit = errors.New("limite mémoire nulle")

// CheckLimit indique si limit laisse de la marge sur la mémoire physique : elle doit rester à 90 % ou moins.
// Une limite nulle est une erreur.
func CheckLimit(limit, physical uint64) (safe bool, err error) {
	if limit == 0 {
		return false, ErrInvalidLimit
	}
	hi, lo := bits.Mul64(physical, 9)
	ceiling, _ := bits.Div64(hi, lo, 10) // physical × 9 / 10 sans débordement
	return limit <= ceiling, nil
}
