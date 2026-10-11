package lab

import (
	"math"
	"time"
)

const year = 365 * 24 * time.Hour

// DiskFailuresPerDay renvoie le nombre moyen de disques qui tombent en panne par jour dans un parc de disks disques
// dont chacun a un MTTF (durée moyenne avant panne) de mttfYears années.
func DiskFailuresPerDay(disks int, mttfYears float64) float64 {
	if disks <= 0 || mttfYears <= 0 {
		return 0
	}
	return float64(disks) / (mttfYears * 365)
}

// SeriesAvailability renvoie la disponibilité d'un ensemble de composants tous nécessaires : si l'un tombe, l'ensemble tombe.
// Les pannes sont supposées indépendantes. Sans composant, rien ne peut tomber : 1.
func SeriesAvailability(availabilities ...float64) float64 {
	product := 1.0
	for _, a := range availabilities {
		product *= a
	}
	return product
}

// ParallelAvailability renvoie la disponibilité d'un ensemble de composants redondants : il suffit qu'un seul fonctionne.
// Les pannes sont supposées indépendantes. Sans composant, personne ne répond : 0.
func ParallelAvailability(availabilities ...float64) float64 {
	if len(availabilities) == 0 {
		return 0
	}
	allDown := 1.0
	for _, a := range availabilities {
		allDown *= 1 - a
	}
	return 1 - allDown
}

// DowntimePerYear renvoie la durée d'indisponibilité annuelle correspondant à une disponibilité (entre 0 et 1),
// arrondie à la milliseconde.
func DowntimePerYear(availability float64) time.Duration {
	availability = math.Min(math.Max(availability, 0), 1)
	seconds := (1 - availability) * year.Seconds()
	return time.Duration(math.Round(seconds*1000)) * time.Millisecond
}

// RequiredAvailability renvoie la disponibilité minimale pour ne pas dépasser maxDowntime d'indisponibilité par an.
func RequiredAvailability(maxDowntime time.Duration) float64 {
	fraction := float64(maxDowntime) / float64(year)
	return math.Min(math.Max(1-fraction, 0), 1)
}

// Nines renvoie le nombre de « neuf » d'une disponibilité : 0,9 → 1, 0,99 → 2, 0,999 → 3.
// Une disponibilité parfaite (1) renvoie 15, une disponibilité inférieure à 0,9 renvoie 0.
func Nines(availability float64) int {
	if availability >= 1 {
		return 15
	}
	if availability < 0.9 {
		return 0
	}
	return min(int(math.Floor(-math.Log10(1-availability)+1e-9)), 15)
}
