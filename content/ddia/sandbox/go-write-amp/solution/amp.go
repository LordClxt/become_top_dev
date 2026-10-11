package lab

// BTreeWriteAmp renvoie l'amplification en écriture d'une mise à jour d'un B-tree : la modification est écrite une
// fois dans le WAL (recordSize octets) puis la page entière est réécrite (pageSize octets), le tout rapporté aux
// recordSize octets que l'application a écrits. recordSize <= 0 renvoie 0.
func BTreeWriteAmp(recordSize, pageSize int) float64 {
	if recordSize <= 0 {
		return 0
	}
	return float64(recordSize+pageSize) / float64(recordSize)
}

// MaxLevels renvoie le plus petit nombre de niveaux L >= 1 tel que branching^L >= n : la profondeur d'un B-tree
// qui doit référencer n pages avec ce facteur de branchement. branching < 2 renvoie 0.
func MaxLevels(n, branching int) int {
	if branching < 2 {
		return 0
	}
	levels, capacity := 1, branching
	for capacity < n {
		capacity *= branching
		levels++
	}
	return levels
}

// CapacityBytes renvoie la quantité de données qu'un B-tree de `levels` niveaux peut adresser :
// branching^levels pages de pageSize octets.
func CapacityBytes(levels, branching, pageSize int) int64 {
	pages := int64(1)
	for i := 0; i < levels; i++ {
		pages *= int64(branching)
	}
	return pages * int64(pageSize)
}

// Result est le bilan d'une simulation de LSM-tree.
type Result struct {
	UserBytes    int64   // octets écrits par l'application
	TotalWritten int64   // octets écrits sur disque : WAL + flush + compactions
	Segments     int     // SSTables restantes
	Amp          float64 // TotalWritten / UserBytes
}

// SimulateSizeTiered simule un LSM-tree à compaction size-tiered. Chaque flush de memtable écrit flushBytes octets
// (qui ont aussi été écrits dans le WAL) dans une SSTable de niveau 0. Dès qu'un niveau contient fanIn SSTables, elles
// sont fusionnées en une SSTable du niveau suivant, de taille égale à la somme (on suppose qu'aucune clé n'est en
// double) : la fusion écrit cette taille sur disque. La cascade se poursuit niveau par niveau.
// flushes <= 0, flushBytes <= 0 ou fanIn < 2 : résultat nul.
func SimulateSizeTiered(flushBytes int64, flushes, fanIn int) Result {
	if flushes <= 0 || flushBytes <= 0 || fanIn < 2 {
		return Result{}
	}
	user := flushBytes * int64(flushes)
	total := 2 * user // WAL + flush
	var counts []int  // nombre de SSTables à chaque niveau
	for i := 0; i < flushes; i++ {
		level, size := 0, flushBytes
		for {
			if level == len(counts) {
				counts = append(counts, 0)
			}
			counts[level]++
			if counts[level] < fanIn {
				break
			}
			counts[level] = 0
			size *= int64(fanIn)
			total += size
			level++
		}
	}
	segments := 0
	for _, c := range counts {
		segments += c
	}
	return Result{UserBytes: user, TotalWritten: total, Segments: segments, Amp: float64(total) / float64(user)}
}
