package lab

// entry est un maillon d'une liste doublement chaînée.
type entry struct {
	key, value string
	prev, next *entry
}

// Cache est un cache LRU (Least Recently Used) : quand il est plein, il oublie l'entrée utilisée le moins récemment.
//
// Les entrées sont dans une liste doublement chaînée, de la plus récente (après head) à la moins récente (avant tail).
// head et tail sont deux maillons sentinelles : ils simplifient les insertions et suppressions, car tout vrai maillon
// a toujours un précédent et un suivant. Une map retrouve un maillon par sa clé en temps constant.
type Cache struct {
	capacity                int
	items                   map[string]*entry
	head, tail              *entry
	hits, misses, evictions int
}

// NewCache crée un cache de capacity entrées (au moins une).
func NewCache(capacity int) *Cache {
	capacity = max(capacity, 1)
	c := &Cache{
		capacity: capacity,
		items:    make(map[string]*entry, capacity),
		head:     &entry{},
		tail:     &entry{},
	}
	c.head.next, c.tail.prev = c.tail, c.head
	return c
}

func (c *Cache) unlink(e *entry) {
	e.prev.next, e.next.prev = e.next, e.prev
	e.prev, e.next = nil, nil
}

func (c *Cache) pushFront(e *entry) {
	e.prev, e.next = c.head, c.head.next
	c.head.next.prev = e
	c.head.next = e
}

// Put ajoute ou met à jour une entrée, qui devient la plus récente. Si le cache dépasse sa capacité,
// l'entrée la moins récente est supprimée.
func Put(c *Cache, key, value string) {
	if c == nil {
		return
	}
	if e, ok := c.items[key]; ok {
		e.value = value
		c.unlink(e)
		c.pushFront(e)
		return
	}
	e := &entry{key: key, value: value}
	c.items[key] = e
	c.pushFront(e)
	if len(c.items) > c.capacity {
		oldest := c.tail.prev
		c.unlink(oldest)
		delete(c.items, oldest.key)
		c.evictions++
	}
}

// Get renvoie la valeur d'une clé et la marque comme la plus récente. Il compte un succès ou un échec.
func Get(c *Cache, key string) (string, bool) {
	if c == nil {
		return "", false
	}
	e, ok := c.items[key]
	if !ok {
		c.misses++
		return "", false
	}
	c.hits++
	c.unlink(e)
	c.pushFront(e)
	return e.value, true
}

// Peek renvoie la valeur d'une clé sans changer son rang de récence ni les statistiques.
func Peek(c *Cache, key string) (string, bool) {
	if c == nil {
		return "", false
	}
	if e, ok := c.items[key]; ok {
		return e.value, true
	}
	return "", false
}

// Delete supprime une clé. Il renvoie false si elle est absente. Une suppression n'est pas une éviction.
func Delete(c *Cache, key string) bool {
	if c == nil {
		return false
	}
	e, ok := c.items[key]
	if !ok {
		return false
	}
	c.unlink(e)
	delete(c.items, key)
	return true
}

// Len renvoie le nombre d'entrées.
func Len(c *Cache) int {
	if c == nil {
		return 0
	}
	return len(c.items)
}

// Keys renvoie les clés de la plus récente à la moins récente.
func Keys(c *Cache) []string {
	keys := []string{}
	if c == nil {
		return keys
	}
	for e := c.head.next; e != c.tail; e = e.next {
		keys = append(keys, e.key)
	}
	return keys
}

// Stats renvoie le nombre de succès et d'échecs de Get, et d'évictions.
func Stats(c *Cache) (hits, misses, evictions int) {
	if c == nil {
		return 0, 0, 0
	}
	return c.hits, c.misses, c.evictions
}
