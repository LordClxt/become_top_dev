package lab

// Generate renvoie un channel en lecture seule qui livre les valeurs de nums dans l'ordre,
// puis se ferme. La goroutine qui écrit se termine une fois toutes les valeurs lues.
func Generate(nums ...int) <-chan int {
	// TODO
	panic("à implémenter")
}

// Collect lit ch jusqu'à sa fermeture et renvoie les valeurs reçues, dans l'ordre.
// Un channel fermé tout de suite donne une slice vide.
func Collect(ch <-chan int) []int {
	// TODO
	panic("à implémenter")
}

// Map renvoie un channel en lecture seule qui livre f(v) pour chaque v lu sur in, dans l'ordre,
// et se ferme quand in est fermé. Il ne doit pas laisser de goroutine bloquée une fois in épuisé et lu en entier.
func Map(in <-chan int, f func(int) int) <-chan int {
	// TODO
	panic("à implémenter")
}

// PingPong fait échanger deux goroutines sur deux channels SANS tampon, n fois :
// la première envoie « ping i », la seconde répond « pong i » (i de 1 à n). Renvoie le journal dans l'ordre
// exact : ping 1, pong 1, ping 2, pong 2, … Pour n <= 0, renvoie une slice vide.
func PingPong(n int) []string {
	// TODO
	panic("à implémenter")
}
