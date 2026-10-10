package lab

import (
	"errors"
	"math"
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
	// TODO
	panic("à implémenter")
}

// ParseMemLimit lit une valeur de GOMEMLIMIT : des chiffres suivis d'un suffixe facultatif
// (B, KiB, MiB, GiB ou TiB, en respectant la casse).
func ParseMemLimit(s string) (uint64, error) {
	// TODO
	panic("à implémenter")
}

// ReadGCSettings lit GOGC et GOMEMLIMIT dans env.
// GOGC absent ou vide vaut 100 ; « off » désactive le GC ; sinon un entier >= 0.
// GOMEMLIMIT absent ou vide vaut NoLimit ; sinon voir ParseMemLimit.
func ReadGCSettings(env map[string]string) (GCSettings, error) {
	// TODO
	panic("à implémenter")
}

// EffectiveTarget renvoie la taille de tas qui déclenchera réellement le prochain cycle :
// le déclenchement de GOGC, ramené à la limite mémoire si elle est plus basse.
func EffectiveTarget(heap uint64, s GCSettings) uint64 {
	// TODO
	panic("à implémenter")
}

// ErrInvalidLimit est renvoyée par CheckLimit quand la limite est nulle.
var ErrInvalidLimit = errors.New("limite mémoire nulle")

// CheckLimit indique si limit laisse de la marge sur la mémoire physique : elle doit rester à 90 % ou moins.
// Une limite nulle est une erreur.
func CheckLimit(limit, physical uint64) (safe bool, err error) {
	// TODO
	panic("à implémenter")
}
