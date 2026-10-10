package lab

// Approx indique si a et b sont égaux à epsilon près.
func Approx(a, b, epsilon float64) bool {
	// TODO
	panic("à implémenter")
}

// ParseCents lit un montant décimal comme « 12.34 » et renvoie des centimes, sans jamais utiliser de flottant.
func ParseCents(s string) (int64, error) {
	// TODO
	panic("à implémenter")
}

// FormatCents affiche des centimes sous la forme « 12.34 ».
func FormatCents(cents int64) string {
	// TODO
	panic("à implémenter")
}

// SplitBill répartit total centimes entre n personnes sans en perdre un seul :
// les premières personnes paient un centime de plus quand la division ne tombe pas juste.
func SplitBill(total int64, n int) []int64 {
	// TODO
	panic("à implémenter")
}
