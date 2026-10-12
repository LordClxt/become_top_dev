package lab

// SafeSend envoie v sur ch et renvoie true. Si ch est fermé, l'envoi provoquerait un panic : SafeSend le rattrape
// et renvoie false. (On suppose que ch a de la place ou est fermé : SafeSend ne gère pas l'attente.)
func SafeSend(ch chan int, v int) (sent bool) {
	// TODO
	panic("à implémenter")
}

// SafeClose ferme ch et renvoie true. Si ch est nil ou déjà fermé, close panique : SafeClose le rattrape et renvoie false.
func SafeClose(ch chan int) (closed bool) {
	// TODO
	panic("à implémenter")
}

// Drain lit toutes les valeurs restantes d'un channel FERMÉ (celles du tampon) et les renvoie dans l'ordre.
// Il s'arrête dès que le channel est fermé ET vide (idiome comma ok, sans range). Pour un channel vide fermé : slice vide non nil.
func Drain(ch <-chan int) []int {
	// TODO
	panic("à implémenter")
}

// StartTogether lance n goroutines qui attendent toutes un signal de départ avant d'appeler f(i).
// Elle renvoie deux fonctions : release() donne le départ à tout le monde d'un coup (en fermant un channel, pas en
// envoyant n valeurs), et wait() bloque jusqu'à ce que les n appels de f soient terminés.
// Aucun appel à f ne doit avoir lieu avant release().
func StartTogether(n int, f func(i int)) (release func(), wait func()) {
	// TODO
	panic("à implémenter")
}
