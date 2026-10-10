package lab

// Preview renvoie au plus n caractères de msg, suivis de "…" si le message
// a été coupé. Si n <= 0, elle renvoie une chaîne vide.
func Preview(msg string, n int) string {
	if n <= 0 {
		return ""
	}
	// TODO: len et msg[:n] comptent des bytes, pas des caractères.
	if len(msg) <= n {
		return msg
	}
	return msg[:n] + "…"
}
