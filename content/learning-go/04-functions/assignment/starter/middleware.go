package lab

// Handler traite une requête textuelle et renvoie une réponse ou une erreur.
type Handler func(request string) (string, error)

// Middleware enveloppe un Handler pour lui ajouter un comportement.
type Middleware func(Handler) Handler

// Chain enveloppe h avec les middlewares. Le premier de la liste est le plus extérieur :
// il s'exécute en premier à l'aller et en dernier au retour.
func Chain(h Handler, middlewares ...Middleware) Handler {
	// TODO
	panic("à implémenter")
}

// Logging appelle logf("start <requête>") avant le handler, puis "end <requête> ok" ou "end <requête> error: <erreur>".
func Logging(logf func(string)) Middleware {
	// TODO
	panic("à implémenter")
}

// Retry réessaie le handler jusqu'à attempts essais au total (au moins un).
// Il renvoie le premier succès, ou l'erreur du dernier essai.
func Retry(attempts int) Middleware {
	// TODO
	panic("à implémenter")
}

// WithPrefix ajoute prefix devant la réponse en cas de succès. Une erreur passe sans modification.
func WithPrefix(prefix string) Middleware {
	// TODO
	panic("à implémenter")
}

// Validate refuse la requête, sans appeler le handler, si check renvoie une erreur.
func Validate(check func(request string) error) Middleware {
	// TODO
	panic("à implémenter")
}
