package lab

import "sort"

// Entry est une paire d'une SSTable. Deleted marque une pierre tombale (Value est alors ignorée).
type Entry struct {
	Key     string
	Value   string
	Deleted bool
}

// Merge fusionne des segments triés par clé (une entrée par clé dans chaque segment). segments[0] est le plus ancien,
// le dernier est le plus récent : quand une clé figure dans plusieurs segments, la version du plus récent gagne.
// Le résultat est trié, avec une seule entrée par clé. Si dropTombstones est vrai, les clés dont la version gagnante est
// une pierre tombale sont retirées ; sinon la pierre tombale est conservée (un segment plus ancien non fusionné pourrait
// encore contenir la clé). Les entrées en entrée ne sont pas modifiées.
func Merge(segments [][]Entry, dropTombstones bool) []Entry {
	pos := make([]int, len(segments))
	out := []Entry{}
	for {
		// plus petite clé parmi les têtes de segments
		minKey, found := "", false
		for i, seg := range segments {
			if pos[i] < len(seg) && (!found || seg[pos[i]].Key < minKey) {
				minKey, found = seg[pos[i]].Key, true
			}
		}
		if !found {
			return out
		}
		// le segment le plus récent qui porte cette clé gagne ; tous avancent
		var winner Entry
		for i, seg := range segments {
			if pos[i] < len(seg) && seg[pos[i]].Key == minKey {
				winner = seg[pos[i]]
				pos[i]++
			}
		}
		if winner.Deleted && dropTombstones {
			continue
		}
		out = append(out, winner)
	}
}

// IndexEntry associe une clé à sa position dans la SSTable.
type IndexEntry struct {
	Key string
	Pos int
}

// BuildSparseIndex construit un index creux : une entrée toutes les `every` entrées, en commençant par la première.
// entries est trié. Avec every < 1 ou sans entrée, renvoie nil.
func BuildSparseIndex(entries []Entry, every int) []IndexEntry {
	if every < 1 {
		return nil
	}
	var idx []IndexEntry
	for i := 0; i < len(entries); i += every {
		idx = append(idx, IndexEntry{Key: entries[i].Key, Pos: i})
	}
	return idx
}

// Lookup cherche key dans une SSTable en s'aidant de l'index creux : elle part de la dernière clé indexée <= key
// et balaie vers l'avant jusqu'à trouver la clé ou dépasser sa place. Elle renvoie l'entrée trouvée (y compris une
// pierre tombale), si elle existe, et le nombre d'entrées de la SSTable qu'elle a examinées.
func Lookup(entries []Entry, idx []IndexEntry, key string) (Entry, bool, int) {
	// première entrée d'index dont la clé est > key ; la précédente est le point de départ
	i := sort.Search(len(idx), func(i int) bool { return idx[i].Key > key })
	if i == 0 {
		return Entry{}, false, 0
	}
	scanned := 0
	for p := idx[i-1].Pos; p < len(entries); p++ {
		scanned++
		switch e := entries[p]; {
		case e.Key == key:
			return e, true, scanned
		case e.Key > key:
			return Entry{}, false, scanned
		}
	}
	return Entry{}, false, scanned
}
