package lab

// Cache est un cache LRU (Least Recently Used) : quand il est plein, il oublie l'entrée utilisée le moins récemment.
// Ajoute les champs dont tu as besoin (une map pour retrouver une entrée, une liste doublement chaînée pour la récence…).
type Cache struct {
	// TODO
}

// NewCache crée un cache de capacity entrées (au moins une).
func NewCache(capacity int) *Cache {
	// TODO
	panic("à implémenter")
}

// Put ajoute ou met à jour une entrée, qui devient la plus récente (jalons 1 et 2).
// Si le cache dépasse sa capacité, l'entrée la moins récente est supprimée (jalon 2).
func Put(c *Cache, key, value string) {
	// TODO
	panic("à implémenter")
}

// Get renvoie la valeur d'une clé (jalon 1) et la marque comme la plus récente (jalon 2). Il compte un succès ou un échec (jalon 3).
func Get(c *Cache, key string) (string, bool) {
	// TODO
	panic("à implémenter")
}

// Peek renvoie la valeur d'une clé sans changer son rang de récence ni les statistiques (jalon 3).
func Peek(c *Cache, key string) (string, bool) {
	// TODO
	panic("à implémenter")
}

// Delete supprime une clé. Il renvoie false si elle est absente (jalon 1). Une suppression n'est pas une éviction.
func Delete(c *Cache, key string) bool {
	// TODO
	panic("à implémenter")
}

// Len renvoie le nombre d'entrées (jalon 1).
func Len(c *Cache) int {
	// TODO
	panic("à implémenter")
}

// Keys renvoie les clés de la plus récente à la moins récente (jalon 2).
func Keys(c *Cache) []string {
	// TODO
	panic("à implémenter")
}

// Stats renvoie le nombre de succès et d'échecs de Get, et d'évictions (jalon 3).
func Stats(c *Cache) (hits, misses, evictions int) {
	// TODO
	panic("à implémenter")
}
