package lab

import "unicode/utf8"

// Preview renvoie au plus n caractères de msg, suivis de "…" si le message
// a été coupé. Si n <= 0, elle renvoie une chaîne vide.
func Preview(msg string, n int) string {
	if n <= 0 {
		return ""
	}
	if utf8.RuneCountInString(msg) <= n {
		return msg
	}
	r := []rune(msg)
	return string(r[:n]) + "…"
}
