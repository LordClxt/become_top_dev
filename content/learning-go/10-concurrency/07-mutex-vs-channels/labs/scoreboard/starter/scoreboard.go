package lab

// Scoreboard stocke des scores par nom. Il est utilisé par beaucoup de goroutines en même temps :
// lectures fréquentes, écritures plus rares. Protège-le avec un sync.RWMutex (jamais copié).
type Scoreboard struct {
	// TODO
}

// NewScoreboard crée un tableau vide, prêt à l'emploi.
func NewScoreboard() *Scoreboard {
	// TODO
	panic("à implémenter")
}

// Add ajoute points au score de name (le crée à 0 s'il n'existe pas) et renvoie le nouveau score.
func (s *Scoreboard) Add(name string, points int) int {
	// TODO
	panic("à implémenter")
}

// Get renvoie le score de name et si ce nom existe.
func (s *Scoreboard) Get(name string) (int, bool) {
	// TODO
	panic("à implémenter")
}

// Top renvoie le nom qui a le meilleur score ; à égalité, le premier dans l'ordre alphabétique.
// ok vaut false si le tableau est vide.
func (s *Scoreboard) Top() (name string, points int, ok bool) {
	// TODO
	panic("à implémenter")
}

// Snapshot renvoie une COPIE des scores : la modifier ne doit pas changer le tableau.
func (s *Scoreboard) Snapshot() map[string]int {
	// TODO
	panic("à implémenter")
}
