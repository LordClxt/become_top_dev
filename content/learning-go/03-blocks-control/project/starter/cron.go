package lab

import (
	"errors"
	"time"
)

var (
	ErrSyntax = errors.New("syntaxe invalide")
	ErrRange  = errors.New("valeur hors plage")
)

// ExpandField développe un champ de planification en la liste triée et sans doublon de ses valeurs.
// Voir instructions.md pour la grammaire.
func ExpandField(field string, min, max int) ([]int, error) {
	// TODO (jalon 1)
	panic("à implémenter")
}

// Schedule est une planification à cinq champs, façon cron.
type Schedule struct {
	Minutes, Hours, Days, Months, Weekdays []int
}

// Parse lit « minute heure jour-du-mois mois jour-de-semaine ».
// Plages : minute 0-59, heure 0-23, jour 1-31, mois 1-12, jour de semaine 0-6 (0 = dimanche).
func Parse(spec string) (Schedule, error) {
	// TODO (jalon 2)
	panic("à implémenter")
}

// Matches indique si la minute de t correspond à la planification (les secondes sont ignorées).
// Les cinq champs doivent tous correspondre, y compris jour du mois ET jour de semaine.
func (s Schedule) Matches(t time.Time) bool {
	// TODO (jalon 2)
	panic("à implémenter")
}

// Next renvoie la première minute strictement postérieure à after qui correspond à la planification,
// avec les secondes à zéro, dans le fuseau de after. ok vaut false si aucune minute ne correspond dans les cinq ans.
func (s Schedule) Next(after time.Time) (next time.Time, ok bool) {
	// TODO (jalon 3)
	panic("à implémenter")
}
