package lab

import "time"

// DiskFailuresPerDay renvoie le nombre moyen de disques qui tombent en panne par jour dans un parc de disks disques
// dont chacun a un MTTF (durée moyenne avant panne) de mttfYears années.
func DiskFailuresPerDay(disks int, mttfYears float64) float64 {
	// TODO
	panic("à implémenter")
}

// SeriesAvailability renvoie la disponibilité d'un ensemble de composants tous nécessaires : si l'un tombe, l'ensemble tombe.
// Les pannes sont supposées indépendantes. Sans composant, rien ne peut tomber : 1.
func SeriesAvailability(availabilities ...float64) float64 {
	// TODO
	panic("à implémenter")
}

// ParallelAvailability renvoie la disponibilité d'un ensemble de composants redondants : il suffit qu'un seul fonctionne.
// Les pannes sont supposées indépendantes. Sans composant, personne ne répond : 0.
func ParallelAvailability(availabilities ...float64) float64 {
	// TODO
	panic("à implémenter")
}

// DowntimePerYear renvoie la durée d'indisponibilité annuelle correspondant à une disponibilité (entre 0 et 1),
// arrondie à la milliseconde.
func DowntimePerYear(availability float64) time.Duration {
	// TODO
	panic("à implémenter")
}

// RequiredAvailability renvoie la disponibilité minimale pour ne pas dépasser maxDowntime d'indisponibilité par an.
func RequiredAvailability(maxDowntime time.Duration) float64 {
	// TODO
	panic("à implémenter")
}

// Nines renvoie le nombre de « neuf » d'une disponibilité : 0,9 → 1, 0,99 → 2, 0,999 → 3.
// Une disponibilité parfaite (1) renvoie 15, une disponibilité inférieure à 0,9 renvoie 0.
func Nines(availability float64) int {
	// TODO
	panic("à implémenter")
}
