package lab

// Entry est une paire d'une SSTable. Deleted marque une pierre tombale (Value est alors ignorée).
type Entry struct {
	Key     string
	Value   string
	Deleted bool
}

// Merge fusionne des segments triés par clé (une entrée par clé dans chaque segment). segments[0] est le plus ancien,
// le dernier est le plus récent : quand une clé figure dans plusieurs segments, la version du plus récent gagne.
// Le résultat est trié, avec une seule entrée par clé (slice vide non nil s'il n'y a rien). Si dropTombstones est vrai,
// les clés dont la version gagnante est une pierre tombale sont retirées ; sinon la pierre tombale est conservée
// (un segment plus ancien non fusionné pourrait encore contenir la clé). Les entrées en entrée ne sont pas modifiées.
func Merge(segments [][]Entry, dropTombstones bool) []Entry {
	// TODO
	panic("à implémenter")
}

// IndexEntry associe une clé à sa position dans la SSTable.
type IndexEntry struct {
	Key string
	Pos int
}

// BuildSparseIndex construit un index creux : une entrée toutes les `every` entrées, en commençant par la première.
// entries est trié. Avec every < 1 ou sans entrée, renvoie nil.
func BuildSparseIndex(entries []Entry, every int) []IndexEntry {
	// TODO
	panic("à implémenter")
}

// Lookup cherche key dans une SSTable en s'aidant de l'index creux : elle part de la dernière clé indexée <= key
// et balaie vers l'avant jusqu'à trouver la clé ou dépasser sa place. Elle renvoie l'entrée trouvée (y compris une
// pierre tombale), si elle existe, et le nombre d'entrées de la SSTable qu'elle a examinées.
// Si key est plus petite que la première clé indexée, la clé est absente et 0 entrée est examinée.
func Lookup(entries []Entry, idx []IndexEntry, key string) (Entry, bool, int) {
	// TODO
	panic("à implémenter")
}
