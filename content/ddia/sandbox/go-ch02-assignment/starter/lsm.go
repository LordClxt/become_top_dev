package lab

// KV est une paire clé-valeur renvoyée par Scan.
type KV struct {
	Key   string
	Value string
}

type entry struct {
	key     string
	value   string
	deleted bool
}

// LSM est un LSM-tree en mémoire : une memtable, puis des SSTables immuables (triées par clé).
type LSM struct {
	limit     int
	mem       map[string]entry
	segments  [][]entry // segments[0] est le plus ancien
	consulted int       // segments examinés par le dernier Get
}

// New crée un LSM-tree dont la memtable est écrite en SSTable dès qu'elle contient limit clés distinctes
// (pierres tombales comprises). limit < 1 est ramené à 1.
func New(limit int) *LSM {
	// TODO
	panic("à implémenter")
}

// Put enregistre une valeur. Quand la memtable atteint limit clés distinctes, elle est écrite en SSTable triée
// (nouveau segment le plus récent) et vidée.
func (l *LSM) Put(key, value string) {
	// TODO
	panic("à implémenter")
}

// Delete enregistre une pierre tombale (même si la clé n'existe pas : un segment plus ancien pourrait la contenir).
func (l *LSM) Delete(key string) {
	// TODO
	panic("à implémenter")
}

// Get cherche d'abord dans la memtable, puis dans les segments du plus récent au plus ancien ;
// une pierre tombale trouvée signifie « absente ».
func (l *LSM) Get(key string) (string, bool) {
	// TODO
	panic("à implémenter")
}

// SegmentsConsulted renvoie le nombre de SSTables examinées par le dernier appel à Get (la memtable n'est pas comptée).
func (l *LSM) SegmentsConsulted() int {
	// TODO
	panic("à implémenter")
}

// Segments renvoie le nombre de SSTables.
func (l *LSM) Segments() int {
	// TODO
	panic("à implémenter")
}

// Scan renvoie, triées par clé, les paires vivantes dont la clé k vérifie lo <= k < hi (hi == "" : sans borne haute).
// Elle voit memtable et segments : la version la plus récente de chaque clé gagne, les pierres tombales masquent.
// Sans résultat, une slice vide non nil.
func (l *LSM) Scan(lo, hi string) []KV {
	// TODO
	panic("à implémenter")
}

// Compact fusionne toutes les SSTables en une seule en abandonnant les pierres tombales et les anciennes versions.
// La memtable n'est pas touchée. S'il ne reste aucune clé vivante, il ne reste aucun segment.
func (l *LSM) Compact() {
	// TODO
	panic("à implémenter")
}
